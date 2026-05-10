import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class AlibabaProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'alibaba', name: 'Alibaba Cloud (Qwen)', avatar: 'qwen' })
  }

  get helpUrl(): string {
    return 'https://dashscope.console.aliyun.com/apiKey'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-...',
        required: true,
        description: 'Your Qwen API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }
}
