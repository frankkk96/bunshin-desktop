import { useState } from 'react'
import { useAppSettingsQuery } from '@/hooks/settings/query'
import { http } from '@/lib/tauri/system/http'
import { toast } from '@/lib/core/utils/toast'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface UseProxyReturn {
  proxyUrl: string
  testStatus: TestStatus
  handleProxyUrlChange: (url: string) => void
  handleTestProxy: () => Promise<void>
}

export function useProxy(): UseProxyReturn {
  const { data: settings } = useAppSettingsQuery()
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')

  // Get proxy URL from settings
  const proxyUrl = settings?.proxy?.url || ''

  // Handle proxy URL changes (the actual save is handled by GeneralSection)
  const handleProxyUrlChange = (_url: string) => {
    // Just update local state for UI, the parent component will handle saving
    // Reset test status when URL changes
    setTestStatus('idle')
  }

  // Test proxy connection
  const handleTestProxy = async () => {
    if (!proxyUrl.trim()) {
      toast.error('Please enter a proxy URL first')
      return
    }

    setTestStatus('testing')

    try {
      const isWorking = await http.testProxy(proxyUrl.trim())

      if (isWorking) {
        setTestStatus('success')
        toast.success('Proxy connection successful!')
      } else {
        setTestStatus('error')
        toast.error('Proxy connection failed')
      }
    } catch (error) {
      setTestStatus('error')
      toast.error(`Proxy test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    proxyUrl,
    testStatus,
    handleProxyUrlChange,
    handleTestProxy,
  }
}
