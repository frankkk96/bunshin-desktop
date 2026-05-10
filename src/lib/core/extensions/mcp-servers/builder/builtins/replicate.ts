import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { BuiltinMCPServerConfig, MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class ReplicateBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Replicate',
      description:
        'Replicate is a platform for running open-source AI models. It is a popular choice for running image generation models.',
      avatar: 'replicate',
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
      type: 'replicate',
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
      command: 'npx',
      args: ['-y', 'replicate-mcp'],
      env: [{ key: 'REPLICATE_API_TOKEN', value: apiKey }],
      url: undefined,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
