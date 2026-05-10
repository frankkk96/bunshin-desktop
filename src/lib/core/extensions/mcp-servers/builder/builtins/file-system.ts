import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { BuiltinMCPServerConfig, MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class FileSystemBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'File System',
      description:
        'Grant controlled access to read, write, and manage files and directories in your local file system. Useful for file operations, content analysis, and data processing tasks.',
      avatar: 'mcp',
    })
  }

  get configSchema(): ConfigSchema {
    return {
      path: { label: 'Path', type: 'string', required: true },
    }
  }

  get initialConfig(): MCPServerBuilderConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      avatar: this.avatar,
      type: 'file-system',
      config: { path: '' },
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const path = (config.config as BuiltinMCPServerConfig).path as string
    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', path],
      env: [],
      url: undefined,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
