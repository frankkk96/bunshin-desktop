import { ConfigSchema } from '../../config/types'
import { Provider, ProviderMeta, Request } from '../base'
import { Message, QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { ExtensionTool } from '@/lib/core/extensions/types'
import { mediaApi } from '@/lib/tauri/service/media'
import { eventBus } from '../../events/event-bus'
import { ToolCallEventType } from '../../events/tool-call'
import Anthropic from '@anthropic-ai/sdk'
import type {
  MessageParam,
  Tool,
  ContentBlockParam,
  ToolResultBlockParam,
  TextBlockParam,
  ImageBlockParam,
} from '@anthropic-ai/sdk/resources/messages'

// Anthropic 默认配置
const ANTHROPIC_META: ProviderMeta = {
  id: 'anthropic',
  name: 'Anthropic',
  avatar: 'claude',
}

export class AnthropicProvider extends Provider {
  constructor(meta: ProviderMeta = ANTHROPIC_META) {
    super(meta)
  }

  get helpUrl(): string {
    return 'https://console.anthropic.com/'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-ant-...',
        required: true,
        description: 'Your Anthropic API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.anthropic.com'
  }

  get configured(): boolean {
    return !!this.config.apiKey
  }

  protected get apiKey(): string {
    if (!this.config.apiKey) {
      throw new Error('API key is required')
    }
    return this.config.apiKey as string
  }

  protected createClient(): Anthropic {
    return new Anthropic({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
    })
  }

  private async buildMessages(messages: Message[]): Promise<MessageParam[]> {
    const result: MessageParam[] = []

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        const content: ContentBlockParam[] = []

        // 处理媒体文件
        for (const media of query.medias) {
          if (media.media.type === 'image') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              // Anthropic 需要纯 base64 格式的图片，从 data URL 中提取
              const base64Data = transferResult.dataUrl.split(',')[1]
              const mimeType = (media.media.mimeType || 'image/jpeg') as
                | 'image/jpeg'
                | 'image/png'
                | 'image/gif'
                | 'image/webp'
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Data,
                },
              } as ImageBlockParam)
            }
          }
          if (media.media.type === 'pdf') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              const base64Data = transferResult.dataUrl.split(',')[1]
              content.push({
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                },
              } as ContentBlockParam)
            }
          }
        }

        // 添加文本内容
        if (query.text) {
          content.push({ type: 'text', text: query.text } as TextBlockParam)
        }

        if (content.length > 0) {
          result.push({ role: 'user', content })
        }
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        const assistantContent: ContentBlockParam[] = []
        const toolResults: ToolResultBlockParam[] = []

        for (const item of response.data) {
          switch (item.type) {
            case 'content':
              if (item.content) {
                assistantContent.push({ type: 'text', text: item.content } as TextBlockParam)
              }
              break
            case 'media':
              assistantContent.push({
                type: 'text',
                text: `[Media: ${JSON.stringify(item.media)}]`,
              } as TextBlockParam)
              break
            case 'tool_call':
              // 添加 assistant 的 tool_use
              assistantContent.push({
                type: 'tool_use',
                id: item.tc.id,
                name: item.tc.function.name,
                input: JSON.parse(item.tc.function.arguments || '{}'),
              })
              // 收集 tool_result
              toolResults.push({
                type: 'tool_result',
                tool_use_id: item.tc.id,
                content: item.text || '',
              })
              break
          }
        }

        // 先添加 assistant 消息
        if (assistantContent.length > 0) {
          result.push({ role: 'assistant', content: assistantContent })
        }

        // 再添加 user 消息（包含 tool_result）
        if (toolResults.length > 0) {
          result.push({ role: 'user', content: toolResults })
        }
      }
    }

    return result
  }

  private buildTools(tools: ExtensionTool[]): Tool[] {
    return tools.map((tool) => ({
      name: `mcp_${tool.extensionId}_${tool.name}`,
      description: tool.description || `Tool from ${tool.extensionName}`,
      input_schema: (tool.inputSchema as Tool['input_schema']) || {
        type: 'object' as const,
        properties: {},
      },
    }))
  }

  public async run(request: Request): Promise<void> {
    await this.ready

    let hasToolCall = false
    const client = this.createClient()
    const messages = await this.buildMessages(request.messages)
    const tools = this.buildTools(request.tools)

    const stream = client.messages.stream(
      {
        model: request.model,
        max_tokens: 8192,
        system: request.systemPrompt || undefined,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      },
      { signal: request.signal },
    )

    const toolCallAccumulator = new Map<number, { id: string; name: string; arguments: string }>()

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          hasToolCall = true
          toolCallAccumulator.set(event.index, {
            id: event.content_block.id,
            name: event.content_block.name,
            arguments: '',
          })
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          this.emitChunk(request.context, {
            type: 'content.delta',
            delta: event.delta.text,
          })
        } else if (event.delta.type === 'input_json_delta') {
          const existing = toolCallAccumulator.get(event.index)
          if (existing) {
            existing.arguments += event.delta.partial_json
          }
        }
      }
    }

    // 发送所有工具调用事件
    toolCallAccumulator.forEach((tc) => {
      eventBus.emit(ToolCallEventType.ToolCallPending, {
        metadata: request.context,
        tc: { id: tc.id, function: { name: tc.name, arguments: tc.arguments } },
      })
    })

    if (hasToolCall) {
      request.hooks.onPendingApproval()
    } else {
      request.hooks.onSuccess()
    }
  }
}
