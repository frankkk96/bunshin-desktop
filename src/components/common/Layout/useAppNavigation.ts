import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { useAllSessions } from '@/hooks/sessions/query'
import { useSessionMutations } from '@/hooks/sessions/mutations'
import { handleApiError } from '@/lib/core/utils/error'
import { sessionId } from '@/lib/core/utils/random'

/**
 * 统一的应用导航 hook
 * 提供所有导航相关的功能
 */
export function useAppNavigation() {
  const navigate = useNavigate()
  const { data: sessions = [] } = useAllSessions()
  const sessionMutations = useSessionMutations()

  // === 基础导航方法 ===

  const navigateToSession = useCallback(
    (sessionId: string) => {
      // 记录访问时间用于 recent chats 排序
      sessionMutations.updateSessionVisited.mutate(sessionId)
      navigate(`/chats/${sessionId}`)
    },
    [navigate, sessionMutations.updateSessionVisited],
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

  // === 智能导航方法 ===

  /**
   * 导航到指定 contact 的聊天
   * 如果存在会话，选择最新的；否则创建新会话
   */
  const navigateToContactChat = useCallback(
    async (contactId: string) => {
      try {
        // 查找该目标的最新会话
        const contactSessions = sessions.filter((s) => s.contactId === contactId)

        if (contactSessions.length > 0) {
          // 选择最新的会话
          const latestSession = contactSessions.reduce((latest, current) =>
            (current.updatedAt || 0) > (latest.updatedAt || 0) ? current : latest,
          )
          navigateToSession(latestSession.id)
        } else {
          // 创建新会话
          const newSessionId = sessionId()
          sessionMutations.createSession.mutate(
            {
              sessionId: newSessionId,
              contactId: contactId,
            },
            {
              onSuccess: () => {
                navigateToSession(newSessionId)
              },
            },
          )
        }
      } catch (error) {
        handleApiError(error)
      }
    },
    [navigate, sessions, sessionMutations, navigateToSession],
  )

  // === 便捷方法 ===

  return {
    // 基础导航
    navigateToSession,
    navigateToContact,
    navigateToTab,

    // 智能导航
    navigateToContactChat,
  }
}
