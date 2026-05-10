import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class MistralProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'mistral', name: 'Mistral AI', avatar: 'mistral' })
  }

  get helpUrl(): string {
    return 'https://console.mistral.ai/api-keys/'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        required: true,
        description: 'Your Mistral AI API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.mistral.ai/v1'
  }
}
