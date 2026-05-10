import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class XAIProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'xai', name: 'xAI', avatar: 'xai' })
  }

  get helpUrl(): string {
    return 'https://console.x.ai/'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'xai-...',
        required: true,
        description: 'Your xAI API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.x.ai/v1'
  }
}
