import { v4 as uuidv4 } from 'uuid'
import { customAlphabet } from 'nanoid'
import { MCPServerConfigType } from '../extensions/mcp-servers/types'

/**
 * 简单的字符串哈希函数
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Random ID utilities using mature JavaScript libraries
const randomId = {
  // UUID v4 for sessions, agents, tasks
  uuid: () => uuidv4(),

  // Short ID (8 characters, alphanumeric) for image names, MCP servers
  shortId: () =>
    customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 8)(),

  // Mini ID (6 characters, alphanumeric) for messages, queries, groups
  miniId: () =>
    customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 6)(),

  // Hash-based ID: generates a deterministic ID based on input string
  hashId: (input: string, length: number = 6) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const hash = simpleHash(input)
    let result = ''

    let num = hash
    for (let i = 0; i < length; i++) {
      result += alphabet[num % alphabet.length]
      num = Math.floor(num / alphabet.length)
    }

    return result
  },
}

export const agentId = (): string => {
  return randomId.uuid()
}

export const groupId = (): string => {
  return randomId.uuid()
}

export const sessionId = (): string => {
  return randomId.uuid()
}

export const queryMessageId = (): string => {
  return randomId.uuid()
}

export const taskId = (): string => {
  return randomId.uuid()
}

export const promptId = (): string => {
  return randomId.miniId()
}

export const extensionId = (): string => {
  return randomId.miniId()
}

export const mediaId = (): string => {
  return randomId.miniId()
}

export const providerId = (): string => {
  return randomId.miniId()
}

/**
 * Generate a deterministic MCP server ID based on agentId and server type
 * This ensures the same builtin server always has the same ID for a given agent
 */
export const mcpServerId = (agentId: string, serverType: MCPServerConfigType): string => {
  return randomId.hashId(`${agentId}:${serverType}`, 8)
}
