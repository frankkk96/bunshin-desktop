import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { BuiltinMCPServerConfig, MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class ElevenLabsBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Eleven Labs',
      description:
        'Integrate with Eleven Labs to generate speech from text. Convert natural language into lifelike audio for voice assistants, chatbots, and voice-enabled applications.',
      avatar: 'elevenlabs',
    })
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: { label: 'API Key', type: 'string', required: true },
    }
  }

  get initialConfig(): MCPServerBuilderConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      avatar: this.avatar,
      type: 'eleven-labs',
      config: { apiKey: '' },
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const apiKey = (config.config as BuiltinMCPServerConfig).apiKey as string
    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'stdio',
      command: 'uvx',
      args: ['elevenlabs-mcp'],
      env: [{ key: 'ELEVENLABS_API_KEY', value: apiKey }],
      url: undefined,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
