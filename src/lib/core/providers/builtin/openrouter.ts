import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class OpenRouterProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'openrouter', name: 'OpenRouter', avatar: 'openrouter' })
  }

  get helpUrl(): string {
    return 'https://openrouter.ai/keys'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-or-...',
        required: true,
        description: 'Your OpenRouter API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://openrouter.ai/api/v1'
  }
}
