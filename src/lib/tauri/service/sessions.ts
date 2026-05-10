import { invoke } from '@tauri-apps/api/core'
import type {
  Message,
  PermissionMode,
  RunningSessionInfo,
  Session,
} from '@/lib/types'

export const sessionsApi = {
  list: () => invoke<Session[]>('list_sessions'),
  get: (id: string) => invoke<Session | null>('get_session', { id }),
  delete: (id: string) => invoke<void>('delete_session', { id }),
  setFavorite: (id: string, favorite: boolean) =>
    invoke<void>('update_session_favorite', { id, favorite }),
  markVisited: (id: string) => invoke<void>('update_session_visited', { id }),
  rename: (id: string, name: string | null) =>
    invoke<void>('rename_session', { id, name }),
  start: (input: {
    agentId: string
    cwd: string
    permissionMode: PermissionMode
    name: string | null
  }) => invoke<Session>('start_session', { input }),
  resume: (sessionId: string) => invoke<void>('resume_session', { sessionId }),
  stop: (sessionId: string) => invoke<void>('stop_session', { sessionId }),
  send: (input: {
    sessionId: string
    text: string
    attachments: any[]
  }) => invoke<void>('send_user_message', { input }),
  cancel: (sessionId: string) => invoke<void>('cancel_query', { sessionId }),
  clear: (sessionId: string) => invoke<void>('clear_session', { sessionId }),
  listRunning: () => invoke<RunningSessionInfo[]>('list_running_sessions'),
  getMessages: (sessionId: string) =>
    invoke<Message[]>('get_messages_by_session', { sessionId }),
}

export const pickDirectory = (title?: string) =>
  invoke<string | null>('pick_directory', { title: title ?? null })
