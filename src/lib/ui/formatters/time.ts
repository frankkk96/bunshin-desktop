import { handleRuntimeError } from '@/lib/core/utils/error'
import { formatDistanceToNow } from 'date-fns'

export function formatRelativeTime(timestamp: number | string): string {
  try {
    // Convert timestamp to milliseconds
    let ts: number
    if (typeof timestamp === 'string') {
      // Handle ISO string format (e.g., "2023-12-01T10:30:00.000Z")
      if (timestamp.includes('T') || timestamp.includes('-')) {
        ts = new Date(timestamp).getTime()
      } else {
        // Handle numeric string
        ts = parseInt(timestamp, 10)
      }
    } else {
      ts = timestamp
    }

    // Use date-fns to format the relative time
    return formatDistanceToNow(new Date(ts), { addSuffix: true })
  } catch (error) {
    handleRuntimeError(error instanceof Error ? error : new Error(String(error)), {
      message: 'Time formatting error',
      silent: true,
    })
    return 'Recently'
  }
}
