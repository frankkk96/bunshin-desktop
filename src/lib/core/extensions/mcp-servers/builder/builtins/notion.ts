import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class NotionBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Notion',
      description:
        'Integrate with your Notion workspace to read, create, and update pages, databases, and blocks. Manage your notes, tasks, and knowledge base directly from conversations.',
      avatar: 'notion',
    })
  }

  get configSchema(): ConfigSchema {
    return {}
  }

  get initialConfig(): MCPServerBuilderConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      avatar: this.avatar,
      type: 'notion',
      config: {},
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'http',
      url: 'https://mcp.notion.com/mcp',
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
