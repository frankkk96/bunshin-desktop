import { v4 as uuidv4 } from 'uuid'

const SHORT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function shortRandom(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += SHORT_ALPHABET[Math.floor(Math.random() * SHORT_ALPHABET.length)]
  }
  return out
}

export const agentId = (): string => uuidv4()
export const sessionId = (): string => uuidv4()
export const messageId = (): string => uuidv4()
export const providerId = (): string => uuidv4()
export const mediaId = (): string => shortRandom(10)
