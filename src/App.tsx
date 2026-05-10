// Third-party imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { MacOSTooltipProvider } from '@/components/ui'

import { router } from '@/router'

// Contexts
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthProvider'

// Components
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Styles
import '@/styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟 - 数据在这段时间内被认为是新鲜的，不会refetch
      gcTime: 15 * 60 * 1000, // 15分钟 - 缓存垃圾回收时间（之前叫cacheTime）
      refetchOnWindowFocus: false, // 窗口聚焦时不自动refetch
      refetchOnMount: false, // 组件mount时不自动refetch（如果有缓存数据）
      retry: 1, // 失败重试1次
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <MacOSTooltipProvider delayDuration={100} skipDelayDuration={500}>
              <RouterProvider router={router} />
            </MacOSTooltipProvider>
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
