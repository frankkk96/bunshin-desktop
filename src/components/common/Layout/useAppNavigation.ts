import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'

export function useAppNavigation() {
  const navigate = useNavigate()

  const navigateToSession = useCallback(
    (sessionId: string) => {
      navigate(`/sessions/${sessionId}`)
    },
    [navigate],
  )

  const navigateToAgent = useCallback(
    (agentId?: string) => {
      if (agentId) {
        navigate(`/agents/${agentId}`)
      } else {
        navigate('/agents')
      }
    },
    [navigate],
  )

  const navigateToTab = useCallback(
    (tabId: string) => {
      navigate(`/${tabId}`)
    },
    [navigate],
  )

  return {
    navigateToSession,
    navigateToAgent,
    navigateToTab,
  }
}
