import debounce from 'lodash/debounce'

type DebouncedFunction<T extends (...args: any[]) => any> = ReturnType<typeof debounce<T>>

export interface DebouncedByKey<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  flush: () => void
  cancel: () => void
}

/**
 * Creates a debounced function that debounces by a key.
 * Each unique key gets its own debounce timer.
 *
 * @param fn - The function to debounce
 * @param wait - The debounce wait time in milliseconds
 * @param keyFn - Function to extract the key from arguments
 * @returns A debounced function with flush() and cancel() methods
 *
 * @example
 * const debouncedSave = debounceByKey(
 *   (message: Message) => saveToDb(message),
 *   1000,
 *   (message) => message.id
 * )
 *
 * debouncedSave(msg1) // key: "id1", starts timer
 * debouncedSave(msg1) // key: "id1", resets timer
 * debouncedSave(msg2) // key: "id2", independent timer
 */
export function debounceByKey<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  keyFn: (...args: Parameters<T>) => string
): DebouncedByKey<T> {
  const map = new Map<string, DebouncedFunction<T>>()

  const debouncedFn = (...args: Parameters<T>) => {
    const key = keyFn(...args)

    if (!map.has(key)) {
      map.set(
        key,
        debounce((...latestArgs: Parameters<T>) => {
          fn(...latestArgs)
          map.delete(key)
        }, wait)
      )
    }

    map.get(key)!(...args)
  }

  debouncedFn.flush = () => {
    map.forEach((debouncedFn) => debouncedFn.flush())
    map.clear()
  }

  debouncedFn.cancel = () => {
    map.forEach((debouncedFn) => debouncedFn.cancel())
    map.clear()
  }

  return debouncedFn
}
