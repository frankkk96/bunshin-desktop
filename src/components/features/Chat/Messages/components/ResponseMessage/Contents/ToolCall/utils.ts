/**
 * Formats execution time in seconds to a human-readable string
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Parses tool call arguments and creates a preview string
 */
export function parseArguments(argumentsStr: string | undefined): {
  parsed: any
  preview: string
} {
  if (!argumentsStr) {
    return { parsed: null, preview: '' }
  }

  try {
    const parsed = JSON.parse(argumentsStr)
    const argsStr = JSON.stringify(parsed)
    const preview = argsStr.length > 60 ? argsStr.substring(0, 60) + '...' : argsStr
    return { parsed, preview }
  } catch {
    let preview = argumentsStr.substring(0, 60)
    if (argumentsStr.length > 60) {
      preview += '...'
    }
    return { parsed: null, preview }
  }
}
