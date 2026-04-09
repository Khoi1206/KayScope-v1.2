import { useState, useEffect } from 'react'

/**
 * useDebounce — returns a debounced copy of `value`.
 *
 * The returned value only updates after `delay` ms of inactivity,
 * preventing expensive downstream effects (API calls, heavy re-renders)
 * from firing on every keystroke.
 *
 * @param value - The raw value to debounce
 * @param delay - Debounce window in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
