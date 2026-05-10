import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { BuiltinMCPServerConfig, MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class BraveSearchBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Brave Search',
      description:
        'Perform web searches using the Brave Search API. Get real-time search results, news, and information from across the web with privacy-focused search capabilities.',
      avatar: 'bing',
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
      type: 'brave-search',
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
      args: ['-y', '@brave/brave-search-mcp-server'],
      env: [{ key: 'BRAVE_API_KEY', value: apiKey }],
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
