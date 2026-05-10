import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class MoonshotAIProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'moonshotai', name: 'Moonshot AI', avatar: 'moonshot' })
  }

  get helpUrl(): string {
    return 'https://platform.moonshot.cn/console/api-keys'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-...',
        required: true,
        description: 'Your Moonshot AI API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.moonshot.cn/v1'
  }
}
