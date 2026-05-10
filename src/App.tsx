import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { MacOSTooltipProvider } from '@/components/ui'

import { router } from '@/router'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import '@/styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <MacOSTooltipProvider delayDuration={100} skipDelayDuration={500}>
            <RouterProvider router={router} />
          </MacOSTooltipProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
