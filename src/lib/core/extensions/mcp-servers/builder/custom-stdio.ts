import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from './base'
import {
  CustomMCPServerConfig,
  MCPServerBuilderConfig,
  MCPServerConfig,
  MCPServerStdioConfig,
} from '../types'
import { MCPServer } from '../mcp-server'
import { extensionId } from '@/lib/core/utils/random'

export class CustomStdioMCPServerBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Custom Server (STDIO)',
    })
  }

  get configSchema(): ConfigSchema {
    return {
      name: { label: 'Name', type: 'string', required: true },
      command: { label: 'Command', type: 'string', required: true },
      args: { label: 'Arguments', type: 'array', required: false },
      env: { label: 'Environment Variables', type: 'array', required: false },
    }
  }

  get initialConfig(): MCPServerBuilderConfig {
    return {
      id: this.id,
      name: this.name,
      type: 'custom-stdio',
      config: {
        type: 'stdio',
        config: {
          command: '',
          args: [],
          env: [],
        },
      },
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const customConfig = config.config as CustomMCPServerConfig
    const stdioConfig = customConfig.config as MCPServerStdioConfig

    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'stdio',
      command: stdioConfig.command,
      args: stdioConfig.args,
      env: stdioConfig.env,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}

export function createCustomStdioMCPServerBuilder(): MCPServerBuilder {
  return new CustomStdioMCPServerBuilder({ id: extensionId() })
}
