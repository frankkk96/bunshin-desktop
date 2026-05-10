import React, { createContext, useContext, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useSessionById, useWorkflowById } from '@/hooks/sessions/query'
import type { SessionMetadata } from '@/lib/tauri/repo/sessions'
import { useContact } from '@/hooks/contacts/shared/query'
import type { Contact } from '@/hooks/contacts/shared/types'
import type { WorkflowSnapshot } from '@/lib/core/execution/types'

interface SessionContextValue {
  session: SessionMetadata | null
  contact: Contact | undefined
  workflow: WorkflowSnapshot | null
  isLoading: boolean
}

const defaultContextValue: SessionContextValue = {
  session: null,
  contact: undefined,
  workflow: null,
  isLoading: false,
}

const SessionContext = createContext<SessionContextValue>(defaultContextValue)

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { sessionId } = useParams<{ sessionId?: string }>()

  const { data: session = null, isLoading: sessionLoading } = useSessionById(sessionId ?? '')
  const { data: contact, isLoading: contactLoading } = useContact(session?.contactId ?? '')

  const workflow = useWorkflowById(session?.id ?? '')

  // 使用 ref 保持上一个有效的 session 和 contact，避免切换时闪烁
  const lastValidSessionRef = useRef<SessionMetadata | null>(null)
  const lastValidContactRef = useRef<Contact | undefined>(undefined)

  if (session) {
    lastValidSessionRef.current = session
  }
  if (contact) {
    lastValidContactRef.current = contact
  }

  // 正在加载时使用上一个有效值，避免闪烁
  const isLoading = sessionLoading || contactLoading
  const effectiveSession = session || (isLoading ? lastValidSessionRef.current : null)
  const effectiveContact = contact || (isLoading ? lastValidContactRef.current : undefined)

  const contextValue: SessionContextValue = useMemo(
    () => ({
      session: effectiveSession,
      contact: effectiveContact,
      workflow,
      isLoading,
    }),
    [effectiveSession, effectiveContact, workflow, isLoading],
  )

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}
