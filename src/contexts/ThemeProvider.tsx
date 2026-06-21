import React, { useEffect, useState } from 'react'
import { useAppSettingsQuery } from '@/hooks/settings/query'
import { useSettingsChangeListener } from '@/hooks/settings/mutations'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Listen for settings changes from other windows
  useSettingsChangeListener()

  const { data: settings } = useAppSettingsQuery()

  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPrefersDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const currentTheme = settings?.theme || 'system'
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemPrefersDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(isDark ? 'dark' : 'light')
  }, [isDark])

  return <>{children}</>
}
