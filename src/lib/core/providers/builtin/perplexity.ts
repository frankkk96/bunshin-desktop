import { ConfigSchema } from '../../config/types'
import { Provider, ProviderMeta, Request } from '../base'
import { Message, QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { http } from '@/lib/tauri/system/http'
import { Perplexity } from '@perplexity-ai/perplexity_ai'
import type { ChatMessageInput } from '@perplexity-ai/perplexity_ai/resources/shared'
import type { CompletionCreateParamsStreaming } from '@perplexity-ai/perplexity_ai/resources/chat/completions'
import type { StreamChunk } from '@perplexity-ai/perplexity_ai/resources/chat/chat'

const PERPLEXITY_META: ProviderMeta = {
  id: 'perplexity',
  name: 'Perplexity',
  avatar: 'perplexity',
}

// Perplexity-specific config interface
interface PerplexityModelConfig {
  search_mode?: 'web' | 'academic' | 'sec'
}

export class PerplexityProvider extends Provider {
  constructor() {
    super(PERPLEXITY_META)
  }

  get helpUrl(): string {
    return 'https://www.perplexity.ai/settings/api'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'pplx-...',
        required: true,
        description: 'Your Perplexity API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.perplexity.ai'
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

  protected createClient(): Perplexity {
    return new Perplexity({
      apiKey: this.apiKey,
      fetch: http.fetch,
    })
  }

  private buildMessages(messages: Message[]): ChatMessageInput[] {
    const result: ChatMessageInput[] = []

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        if (query.text) {
          result.push({
            role: 'user',
            content: query.text,
          })
        }
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        let content = ''

        for (const item of response.data) {
          if (item.type === 'content' && item.content) {
            content += item.content
          }
        }

        if (content) {
          result.push({
            role: 'assistant',
            content,
          })
        }
      }
    }

    return result
  }

  /**
   * 从 URL 提取网站简称
   */
  private getHostAbbrev(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace('www.', '')
      // 提取主域名部分，去掉 .com/.org 等后缀
      const parts = hostname.split('.')
      const name = parts.length > 1 ? parts[parts.length - 2] : parts[0]
      // 首字母大写，最多取 12 个字符
      return name.charAt(0).toUpperCase() + name.slice(1, 12)
    } catch {
      return 'Link'
    }
  }

  /**
   * 将 [1][2][3] 格式的引用替换为标准 markdown 链接
   */
  private formatContentWithCitations(content: string, citations: string[]): string {
    if (!citations || citations.length === 0) {
      return content
    }

    let formatted = content
    citations.forEach((url, index) => {
      const refNumber = index + 1
      const pattern = new RegExp(`\\[${refNumber}\\]`, 'g')
      const abbrev = this.getHostAbbrev(url)
      // 直接输出标准 markdown 链接格式
      formatted = formatted.replace(pattern, `[${abbrev}](${url})`)
    })

    return formatted
  }

  /**
   * 解析模型自定义配置
   */
  private parseModelConfig(request: Request): PerplexityModelConfig {
    const config: PerplexityModelConfig = {}

    if (!request.customConfig) {
      return config
    }

    const { configs } = request.customConfig

    // search_mode
    if (configs.search_mode && typeof configs.search_mode === 'string') {
      const value = configs.search_mode
      if (['web', 'academic', 'sec'].includes(value)) {
        config.search_mode = value as 'web' | 'academic' | 'sec'
      }
    }

    return config
  }

  /**
   * 构建 Perplexity API 请求参数
   */
  private buildRequestParams(
    request: Request,
    messages: ChatMessageInput[],
  ): CompletionCreateParamsStreaming {
    const modelConfig = this.parseModelConfig(request)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = {
      model: request.model,
      messages,
      stream: true,
    }

    // 添加 search_mode
    if (modelConfig.search_mode) {
      params.search_mode = modelConfig.search_mode
    }

    return params as CompletionCreateParamsStreaming
  }

  /**
   * 处理流式响应块
   */
  private processStreamChunk(chunk: StreamChunk): {
    content: string
    citations: string[]
  } {
    let content = ''
    const citations = chunk.citations || []

    const choice = chunk.choices?.[0]
    if (choice?.delta?.content) {
      const deltaContent = choice.delta.content
      if (typeof deltaContent === 'string') {
        content = deltaContent
      } else if (Array.isArray(deltaContent)) {
        content = deltaContent
          .filter(
            (c: { type: string; text?: string }): c is { type: 'text'; text: string } =>
              c.type === 'text' && typeof c.text === 'string',
          )
          .map((c: { type: 'text'; text: string }) => c.text)
          .join('')
      }
    }

    return { content, citations }
  }

  public async run(request: Request): Promise<void> {
    await this.ready

    const client = this.createClient()
    const messages = this.buildMessages(request.messages)

    // 添加 system prompt
    if (request.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: request.systemPrompt,
      })
    }

    const params = this.buildRequestParams(request, messages)
    const response = await client.chat.completions.create(params)

    let accumulatedContent = ''
    let citations: string[] = []

    // Stream 实现了 AsyncIterable
    for await (const chunk of response) {
      const processed = this.processStreamChunk(chunk)

      // 收集 citations
      if (processed.citations.length > 0) {
        citations = processed.citations
      }

      // 处理 content delta
      if (processed.content) {
        accumulatedContent += processed.content
        this.emitChunk(request.context, {
          type: 'content.delta',
          delta: processed.content,
        })
      }
    }

    // 流结束后，处理引用链接
    if (accumulatedContent && citations.length > 0) {
      const formattedContent = this.formatContentWithCitations(accumulatedContent, citations)

      if (formattedContent !== accumulatedContent) {
        // 发送完整的 content chunk 替换原来的内容
        this.emitChunk(request.context, {
          type: 'content',
          text: formattedContent,
        })
      }
    }

    // Perplexity 不支持 tool call，总是成功
    request.hooks.onSuccess()
  }
}
