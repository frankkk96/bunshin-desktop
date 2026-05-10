import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from './base'
import {
  CustomMCPServerConfig,
  MCPServerBuilderConfig,
  MCPServerHttpConfig,
  MCPServerConfig,
} from '../types'
import { MCPServer } from '../mcp-server'
import { extensionId } from '@/lib/core/utils/random'

export class CustomHttpMCPServerBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Custom Server (HTTP)',
    })
  }

  get configSchema(): ConfigSchema {
    return {
      name: { label: 'Name', type: 'string', required: true },
      url: { label: 'URL', type: 'string', required: true },
    }
  }

  get initialConfig(): MCPServerBuilderConfig {
    return {
      id: this.id,
      name: this.name,
      type: 'custom-http',
      config: {
        type: 'http',
        config: {
          url: '',
        },
      },
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const customConfig = config.config as CustomMCPServerConfig
    const httpConfig = customConfig.config as MCPServerHttpConfig

    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'http',
      url: httpConfig.url,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}

export function createCustomHttpMCPServerBuilder(): MCPServerBuilder {
  return new CustomHttpMCPServerBuilder({ id: extensionId() })
}
