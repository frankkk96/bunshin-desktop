import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'

export class GroqProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'groq', name: 'Groq', avatar: 'groq' })
  }

  get helpUrl(): string {
    return 'https://console.groq.com/keys'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'gsk_...',
        required: true,
        description: 'Your Groq API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.groq.com/openai/v1'
  }
}
