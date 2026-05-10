import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class ZhipuAIProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'zhipuai', name: 'Zhipu AI', avatar: 'zhipu' })
  }

  get helpUrl(): string {
    return 'https://open.bigmodel.cn/usercenter/apikeys'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        required: true,
        description: 'Your Zhipu AI API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://open.bigmodel.cn/api/paas/v4'
  }
}
