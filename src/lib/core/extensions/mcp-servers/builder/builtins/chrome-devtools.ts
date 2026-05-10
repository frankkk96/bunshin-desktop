import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServerBuilder } from '../base'
import { MCPServerBuilderConfig, MCPServerConfig } from '../../types'
import { MCPServer } from '../../mcp-server'

export class ChromeDevToolsBuilder extends MCPServerBuilder {
  constructor({ id }: { id: string }) {
    super({
      id: id,
      name: 'Chrome DevTools',
      description:
        'Automate and control Chrome browser through DevTools Protocol. Navigate pages, interact with elements, capture screenshots, and perform browser automation tasks programmatically.',
      avatar: 'google',
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
      type: 'chrome-devtools',
      config: {},
      enabled: true,
    }
  }

  buildMCPServer(config: MCPServerBuilderConfig): MCPServer {
    const runtimeConfig: MCPServerConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', 'chrome-devtools-mcp@latest'],
      env: [],
      url: undefined,
      enabled: config.enabled,
    }
    return new MCPServer(runtimeConfig)
  }
}
