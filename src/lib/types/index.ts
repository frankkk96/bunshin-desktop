export type ProviderType = 'subscription' | 'api'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string | null
  createdAt: number
  updatedAt: number
}

export interface EnvVar {
  key: string
  value: string
}

/**
 * Per-agent Claude Code configuration. Every field is optional — an empty object
 * means "use claude defaults". Translated into CLI flags + a merged `--settings`
 * JSON blob when the session subprocess is spawned.
 */
export interface AgentConfig {
  /** `--model`: alias (opus/sonnet/haiku/fable) or full model id. */
  model?: string | null
  /** `--effort`: low | medium | high | xhigh | max. */
  effort?: string | null
  /** `--fallback-model`: comma-separated list. */
  fallbackModel?: string | null
  /** `--append-system-prompt`. */
  appendSystemPrompt?: string | null
  /** Built-in tool names to disable (→ `--disallowedTools`). */
  disabledTools?: string[]
  /** settings.json `includeCoAuthoredBy`. */
  includeCoAuthoredBy?: boolean | null
  /** settings.json `permissions.allow` rules. */
  permissionAllow?: string[]
  /** settings.json `permissions.deny` rules. */
  permissionDeny?: string[]
  /** settings.json `permissions.ask` rules. */
  permissionAsk?: string[]
  /** Environment variables injected via settings.json `env`. */
  env?: EnvVar[]
  /** Raw `{ "mcpServers": { ... } }` JSON passed to `--mcp-config`. */
  mcpConfig?: string | null
  /** Raw settings.json fragment merged last into `--settings`. */
  extraSettings?: string | null
}

export interface Agent {
  id: string
  alias: string
  description: string | null
  avatar: string | null
  providerId: string
  config: AgentConfig
  createdAt: number
  updatedAt: number
}

export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'bypassPermissions'
  | 'dontAsk'

export interface Session {
  id: string
  agentId: string
  name: string | null
  cwd: string
  permissionMode: PermissionMode
  favorite: boolean
  createdAt: number
  updatedAt: number
  visitedAt: number
  claudeSessionId: string
}

/**
 * One row in the messages table = one stream-json event from the claude
 * subprocess (or a `local_user` mirror of an outgoing user message).
 */
export interface Message {
  id: string
  sessionId: string
  seq: number
  kind: string
  payload: any
  timestamp: number
}

export interface RunningSessionInfo {
  sessionId: string
  status: 'running' | 'stopped' | 'crashed'
}
