import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { BuiltinMCPServerConfig, MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class FirecrawlBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Firecrawl',
      description:
        'Advanced web crawler that recursively explores websites, extracting content from multiple pages. Perfect for comprehensive website analysis, documentation gathering, and content aggregation.',
      avatar: 'mcp',
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
      type: 'firecrawl',
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
      args: ['-y', 'firecrawl-mcp'],
      env: [{ key: 'FIRECRAWL_API_KEY', value: apiKey }],
      url: undefined,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
