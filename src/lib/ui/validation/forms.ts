import { uniqueNamesGenerator, Config } from 'unique-names-generator'

// 简短的形容词
const shortAdjectives = [
  'swift', 'brave', 'clever', 'calm', 'bold', 'quick', 'sharp', 'wise',
  'bright', 'keen', 'noble', 'kind', 'wild', 'cool', 'warm', 'soft',
  'firm', 'fair', 'pure', 'free', 'true', 'prime', 'epic', 'vivid',
  'smart', 'agile', 'sleek', 'crisp', 'fresh', 'elite', 'super', 'mega',
]

// 常见动物
const shortAnimals = [
  'fox', 'wolf', 'bear', 'hawk', 'owl', 'lion', 'tiger', 'eagle',
  'deer', 'puma', 'lynx', 'seal', 'orca', 'crow', 'dove', 'swan',
  'hare', 'frog', 'fish', 'crab', 'moth', 'wasp', 'newt', 'toad',
  'goat', 'bull', 'ram', 'elk', 'jay', 'bat', 'ant', 'bee',
]

// 简短的颜色
const shortColors = [
  'red', 'blue', 'gold', 'jade', 'ruby', 'onyx', 'aqua', 'rose',
  'gray', 'navy', 'teal', 'lime', 'plum', 'mint', 'sand', 'snow',
]

/**
 * Validates agent/contact name format
 * Rules:
 * - No spaces allowed
 * - No special characters except underscore and hyphen
 * - Must be between 1-50 characters
 * - Can contain letters, numbers, underscore, and hyphen
 */
export function validateAgentName(name: string): { valid: boolean; error?: string } {
  // Check if empty
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name cannot be empty' }
  }

  // Check length
  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' }
  }

  // Check for spaces
  if (name.includes(' ')) {
    return { valid: false, error: 'Name cannot contain spaces' }
  }

  // Check for special characters (allow only letters, numbers, underscore, hyphen)
  const validNameRegex = /^[a-zA-Z0-9_-]+$/
  if (!validNameRegex.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, underscore and hyphen' }
  }

  return { valid: true }
}

const agentNameConfig: Config = {
  dictionaries: [shortAdjectives, shortAnimals],
  separator: '',
  style: 'capital',
  length: 2,
}

const groupNameConfig: Config = {
  dictionaries: [shortAdjectives, shortColors, shortAnimals],
  separator: '',
  style: 'capital',
  length: 3,
}

/**
 * Generates a unique agent name using adjective + animal pattern
 * Examples: "SwiftFox", "BraveEagle", "CleverWolf"
 */
export function generateUniqueAgentName(_baseName?: string): string {
  return uniqueNamesGenerator(agentNameConfig)
}

/**
 * Generates a unique group name using adjective + color + animal pattern
 * Examples: "SwiftRedFox", "BraveBlueEagle"
 */
export function generateUniqueGroupName(): string {
  return uniqueNamesGenerator(groupNameConfig)
}
