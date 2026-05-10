import { ConfigSchema } from '../../config/types'
import { Provider, ProviderMeta, Request } from '../base'
import { Message, QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { ExtensionTool } from '@/lib/core/extensions/types'
import { mediaApi } from '@/lib/tauri/service/media'
import { eventBus } from '../../events/event-bus'
import { ToolCallEventType } from '../../events/tool-call'
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  ContentBlock,
  Message as BedrockMessage,
  Tool,
  ToolConfiguration,
  ToolInputSchema,
  ImageFormat,
} from '@aws-sdk/client-bedrock-runtime'

const BEDROCK_META: ProviderMeta = {
  id: 'amazon-bedrock',
  name: 'Amazon Bedrock',
  avatar: 'bedrock',
}

export class AmazonBedrockProvider extends Provider {
  constructor(meta: ProviderMeta = BEDROCK_META) {
    super(meta)
  }

  get helpUrl(): string {
    return 'https://console.aws.amazon.com/bedrock/'
  }

  get configSchema(): ConfigSchema {
    return {
      accessKeyId: {
        type: 'string',
        label: 'Access Key ID',
        description: 'Your AWS access key ID for authentication',
        placeholder: 'AKIA...',
        required: true,
      },
      secretAccessKey: {
        type: 'string',
        label: 'Secret Access Key',
        description: 'Your AWS secret access key for authentication',
        placeholder: 'Your AWS secret access key',
        required: true,
      },
      region: {
        type: 'string',
        label: 'Region',
        description: 'AWS region where Bedrock is deployed',
        default: 'us-east-1',
        required: true,
        enum: [
          // US regions
          'us-east-1',
          'us-east-2',
          'us-west-2',
          // EU regions
          'eu-central-1',
          'eu-west-1',
          'eu-west-2',
          'eu-west-3',
          // APAC regions
          'ap-south-1',
          'ap-southeast-1',
          'ap-southeast-2',
          'ap-northeast-1',
          'ap-northeast-2',
          // Other regions
          'ca-central-1',
          'sa-east-1',
        ],
      },
    }
  }

  get baseUrl(): string {
    const region = (this.config.region as string) || 'us-east-1'
    return `https://bedrock-runtime.${region}.amazonaws.com`
  }

  get configured(): boolean {
    return !!(this.config.accessKeyId && this.config.secretAccessKey)
  }

  protected createClient(): BedrockRuntimeClient {
    const region = (this.config.region as string) || 'us-east-1'
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: this.config.accessKeyId as string,
        secretAccessKey: this.config.secretAccessKey as string,
      },
    })
  }

  private async buildMessages(messages: Message[]): Promise<BedrockMessage[]> {
    const result: BedrockMessage[] = []

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        const content: ContentBlock[] = []

        // 处理媒体文件（图片）
        for (const media of query.medias) {
          if (media.media.type === 'image') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              // Bedrock 需要纯 base64 格式的图片，从 data URL 中提取
              const base64Data = transferResult.dataUrl.split(',')[1]
              const mimeType = media.media.mimeType || 'image/jpeg'
              const format = this.getImageFormat(mimeType)
              content.push({
                image: {
                  format,
                  source: {
                    bytes: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
                  },
                },
              })
            }
          }
        }

        // 添加文本内容
        if (query.text) {
          content.push({ text: query.text })
        }

        if (content.length > 0) {
          result.push({ role: 'user', content })
        }
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        const assistantContent: ContentBlock[] = []
        const toolResults: ContentBlock[] = []

        for (const item of response.data) {
          switch (item.type) {
            case 'content':
              if (item.content) {
                assistantContent.push({ text: item.content })
              }
              break
            case 'tool_call':
              // 添加 assistant 的 toolUse
              assistantContent.push({
                toolUse: {
                  toolUseId: item.tc.id,
                  name: item.tc.function.name,
                  input: JSON.parse(item.tc.function.arguments || '{}'),
                },
              })
              // 收集 toolResult
              toolResults.push({
                toolResult: {
                  toolUseId: item.tc.id,
                  content: [{ text: item.text || '' }],
                },
              })
              break
          }
        }

        // 先添加 assistant 消息
        if (assistantContent.length > 0) {
          result.push({ role: 'assistant', content: assistantContent })
        }

        // 再添加 user 消息（包含 toolResult）
        if (toolResults.length > 0) {
          result.push({ role: 'user', content: toolResults })
        }
      }
    }

    return result
  }

  private getImageFormat(mimeType: string): ImageFormat {
    const formatMap: Record<string, ImageFormat> = {
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpeg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    return formatMap[mimeType] || 'jpeg'
  }

  private buildToolConfig(tools: ExtensionTool[]): ToolConfiguration | undefined {
    if (tools.length === 0) return undefined

    const bedrockTools: Tool[] = tools.map((tool) => ({
      toolSpec: {
        name: `mcp_${tool.extensionId}_${tool.name}`,
        description: tool.description || `Tool from ${tool.extensionName}`,
        inputSchema: {
          json: tool.inputSchema || { type: 'object', properties: {} },
        } as ToolInputSchema,
      },
    }))

    return { tools: bedrockTools }
  }

  public async run(request: Request): Promise<void> {
    await this.ready

    const region = this.config.region as string
    if (!region) {
      throw new Error('Region is required')
    }

    // 根据区域设置推理配置文件前缀
    let regionPrefix = 'us'
    if (region.startsWith('ap-')) {
      regionPrefix = 'apac'
    } else if (region.startsWith('eu-')) {
      regionPrefix = 'eu'
    } else if (region.startsWith('us-')) {
      regionPrefix = 'us'
    }

    let hasToolCall = false
    const client = this.createClient()
    const messages = await this.buildMessages(request.messages)
    const toolConfig = this.buildToolConfig(request.tools)
    // request.model 已经是 inference profile ID，可以直接使用
    const modelId = regionPrefix + '.' + request.model

    const command = new ConverseStreamCommand({
      modelId,
      messages,
      system: request.systemPrompt ? [{ text: request.systemPrompt }] : undefined,
      toolConfig,
      inferenceConfig: {
        maxTokens: 8192,
      },
    })

    const response = await client.send(command, {
      abortSignal: request.signal,
    })

    if (!response.stream) {
      throw new Error('No stream in response')
    }

    const toolCallAccumulator = new Map<string, { id: string; name: string; arguments: string }>()
    let currentToolUseId: string | null = null

    for await (const event of response.stream) {
      if (event.contentBlockStart) {
        const start = event.contentBlockStart.start
        if (start?.toolUse) {
          hasToolCall = true
          currentToolUseId = start.toolUse.toolUseId || ''
          toolCallAccumulator.set(currentToolUseId, {
            id: currentToolUseId,
            name: start.toolUse.name || '',
            arguments: '',
          })
        }
      } else if (event.contentBlockDelta) {
        const delta = event.contentBlockDelta.delta
        if (delta?.text) {
          this.emitChunk(request.context, {
            type: 'content.delta',
            delta: delta.text,
          })
        } else if (delta?.toolUse && currentToolUseId) {
          const existing = toolCallAccumulator.get(currentToolUseId)
          if (existing && delta.toolUse.input) {
            existing.arguments += delta.toolUse.input
          }
        }
      } else if (event.contentBlockStop) {
        currentToolUseId = null
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
