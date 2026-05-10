import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class DeepSeekProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'deepseek', name: 'DeepSeek', avatar: 'deepseek' })
  }

  get helpUrl(): string {
    return 'https://platform.deepseek.com/api_keys'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-...',
        required: true,
        description: 'Your DeepSeek API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.deepseek.com/v1'
  }
}
