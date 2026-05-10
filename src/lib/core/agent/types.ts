/**
 * Contact and Agent Types
 * Core domain types for contacts, agents, and groups
 */

import { MCPServerBuilderConfig } from '../extensions/mcp-servers/types'
import { Contact } from '@/hooks/contacts/shared/types'
import { QueryParams } from '../execution/types'

export interface Prompt {
  id: string
  key: string // 触发关键词 (e.g., "summarize")
  description?: string // 可选描述
  queries: QueryParams[] // 一条或多条消息
  createdAt: number
  updatedAt: number
}

export interface PromptConfig {
  systemPrompt: string // system prompt for the agent
  shortcuts: Prompt[] // list of prompts for the agent
}

export interface ExtensionConfig {
  skipPermission: boolean // skip tool call permission approval (default: false)
  mcpServers: MCPServerBuilderConfig[] // map of mcp server configurations: serverId -> config
}

export interface CustomConfig {
  identifier: string
  configs: Record<string, unknown>
}

export interface LLMConfig {
  providerId: string // provider name
  modelId: string // model id
  customConfigs?: CustomConfig[] // optional extra configs for specific provider+model combinations
}

export interface Agent {
  id: string
  alias: string
  description: string
  pinned: boolean
  llm: LLMConfig
  prompt: PromptConfig
  extension: ExtensionConfig
  createdAt: number
  updatedAt: number
}

export function agentToContact(agent: Agent): Contact {
  return {
    id: agent.id,
    type: 'agent',
    alias: agent.alias,
    description: agent.description,
    agents: [agent],
    pinned: agent.pinned,
    shortcuts: agent.prompt.shortcuts,
  }
}
