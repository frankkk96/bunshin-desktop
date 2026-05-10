import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAppSettingsQuery } from '@/hooks/settings/query'
import { useSettingsMutations, useSettingsChangeListener } from '@/hooks/settings/mutations'
import { Theme } from '@/hooks/settings/query'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Listen for settings changes from other windows
  useSettingsChangeListener()

  // Query and mutations
  const { data: settings } = useAppSettingsQuery()
  const { updateSettings } = useSettingsMutations()

  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  // 检测系统主题偏好
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPrefersDark(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // 从设置中获取当前主题
  const currentTheme = settings?.theme || 'system'

  // 计算是否为暗色模式
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemPrefersDark)

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement

    // 移除现有主题类
    root.classList.remove('light', 'dark')

    // 添加当前主题类
    root.classList.add(isDark ? 'dark' : 'light')
  }, [currentTheme, isDark])

  // 设置主题的函数
  const setTheme = (theme: Theme) => {
    updateSettings.mutate({ theme })
  }

  const value: ThemeContextType = {
    theme: currentTheme,
    setTheme,
    isDark,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
