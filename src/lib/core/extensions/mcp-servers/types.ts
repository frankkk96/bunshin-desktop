import { ConfigValue } from '@/lib/core/config/types'

export interface MCPToolResult {
  content: Array<{
    type: string
    text?: string
    data?: string
    url?: string
  }>
  isError?: boolean
}

export type BuiltinMCPServerType =
  | 'brave-search'
  | 'file-system'
  | 'fetch'
  | 'firecrawl'
  | 'chrome-devtools'
  | 'notion'
  | 'github'
  | 'eleven-labs'
  | 'replicate'

export type CustomMCPServerType = 'custom-stdio' | 'custom-http'

export type MCPServerConfigType = CustomMCPServerType | BuiltinMCPServerType

export type MCPServerType = 'stdio' | 'http'

export type MCPServerStdioConfig = {
  command: string
  args: string[]
  env: Array<{ key: string; value: string }>
}

export type MCPServerHttpConfig = {
  url: string
  authToken?: string // Bearer token for HTTP authentication (without "Bearer " prefix)
}

export type CustomMCPServerConfig = {
  type: MCPServerType
  config: MCPServerStdioConfig | MCPServerHttpConfig
}

export type RemoteMCPServerConfig = {
  url: string
}

export type BuiltinMCPServerConfig = ConfigValue

export type MCPServerBuilderConfig = {
  id: string
  name: string
  description?: string
  avatar?: string // Icon key for ProviderIcon (e.g., 'github', 'notion', 'mcp')
  type: MCPServerConfigType
  config: CustomMCPServerConfig | RemoteMCPServerConfig | BuiltinMCPServerConfig
  enabled: boolean
}

export type MCPServerConfig = {
  id: string
  name: string
  description?: string
  serverType: MCPServerType
  command?: string
  args?: string[]
  env?: { key: string; value: string }[]
  url?: string
  enabled: boolean
}
