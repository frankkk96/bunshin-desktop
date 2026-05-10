import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import {
  MacOSButton,
  MacOSTooltip,
  MacOSTooltipContent,
  MacOSTooltipTrigger,
} from '@/components/ui'
import { useAgent } from '@/hooks/agents'
import {
  useCancelQuery,
  useDeleteSession,
  useResumeSession,
  useRunningSessions,
  useSendUserMessage,
  useSessionMessages,
  useStopSession,
} from '@/hooks/sessions'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Message, Session } from '@/lib/types'
import { MessageRenderer } from './MessageRenderer'
import { Composer } from './Composer'
import { Square, Trash2, Play } from 'lucide-react'

interface SessionViewProps {
  session: Session
}

export function SessionView({ session }: SessionViewProps) {
  const navigate = useNavigate()
  const { data: agent } = useAgent(session.agentId)
  const { data: initialMessages = [], refetch } = useSessionMessages(session.id)
  const { data: running = [] } = useRunningSessions()
  const sendMessage = useSendUserMessage()
  const cancelQuery = useCancelQuery()
  const stopSession = useStopSession()
  const resumeSession = useResumeSession()
  const deleteSession = useDeleteSession()

  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const scrollerRef = useRef<HTMLDivElement>(null)

  const status = useMemo(
    () => running.find((r) => r.sessionId === session.id)?.status,
    [running, session.id],
  )
  const isRunning = status === 'running'

  // Reset live buffer + auto-resume any session that isn't already in the manager.
  useEffect(() => {
    setLiveMessages([])
    refetch()
    if (!status) {
      void resumeSession.mutateAsync(session.id).catch((err) => {
        toast.error(`Could not resume session: ${err}`)
      })
    }
  }, [session.id])

  // Live event stream: append, dedup against initial via id.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    listen<Message>(`session:${session.id}:event`, (event) => {
      setLiveMessages((prev) => [...prev, event.payload])
    }).then((u) => {
      unlisten = u
    })
    return () => {
      unlisten?.()
    }
  }, [session.id])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [liveMessages.length, initialMessages.length])

  const allMessages = useMemo(() => {
    const seen = new Set<string>()
    const merged: Message[] = []
    for (const m of [...initialMessages, ...liveMessages]) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      merged.push(m)
    }
    return merged.sort((a, b) => a.seq - b.seq)
  }, [initialMessages, liveMessages])

  const handleSend = async (text: string, attachments: any[]) => {
    if (!isRunning) {
      toast.error('Session is not running')
      return
    }
    try {
      await sendMessage.mutateAsync({ sessionId: session.id, text, attachments })
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleCancel = async () => {
    try {
      await cancelQuery.mutateAsync(session.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleStop = async () => {
    try {
      await stopSession.mutateAsync(session.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleResume = async () => {
    try {
      await resumeSession.mutateAsync(session.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this session and all its messages?')) return
    try {
      if (status) await stopSession.mutateAsync(session.id)
      await deleteSession.mutateAsync(session.id)
      navigate('/sessions')
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-3 border-b border-border select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              status === 'running'
                ? 'bg-emerald-500'
                : status === 'crashed'
                  ? 'bg-red-500'
                  : 'bg-gray-400',
            )}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {session.name || agent?.alias || 'Session'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {agent?.alias ?? 'Unknown agent'} · {session.cwd} · {session.permissionMode}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isRunning ? (
            <MacOSTooltip>
              <MacOSTooltipTrigger asChild>
                <MacOSButton variant="icon" onClick={handleStop}>
                  <Square size={16} />
                </MacOSButton>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="bottom">Stop subprocess</MacOSTooltipContent>
            </MacOSTooltip>
          ) : (
            <MacOSTooltip>
              <MacOSTooltipTrigger asChild>
                <MacOSButton variant="icon" onClick={handleResume}>
                  <Play size={16} />
                </MacOSButton>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="bottom">Resume session</MacOSTooltipContent>
            </MacOSTooltip>
          )}
          <MacOSTooltip>
            <MacOSTooltipTrigger asChild>
              <MacOSButton variant="icon" onClick={handleDelete}>
                <Trash2 size={16} />
              </MacOSButton>
            </MacOSTooltipTrigger>
            <MacOSTooltipContent side="bottom">Delete session</MacOSTooltipContent>
          </MacOSTooltip>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {allMessages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            Subprocess is starting up — send your first message below.
          </div>
        )}
        {allMessages.map((m) => (
          <MessageRenderer key={m.id} message={m} />
        ))}
      </div>

      <Composer
        disabled={!isRunning}
        onSend={handleSend}
        onCancel={handleCancel}
        canCancel={isRunning}
      />
    </div>
  )
}
