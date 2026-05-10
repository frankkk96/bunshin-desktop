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

  const navigateToContact = useCallback(
    (contactId?: string) => {
      if (contactId) {
        navigate(`/contacts/${contactId}`)
      } else {
        navigate('/contacts')
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
    navigateToContact,
    navigateToTab,
  }
}
