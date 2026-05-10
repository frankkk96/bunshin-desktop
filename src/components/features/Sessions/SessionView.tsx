import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  Clock,
  Eraser,
  Loader2,
  MoreHorizontal,
  Square,
  Trash2,
} from 'lucide-react'
import {
  MacOSPopover,
  MacOSPopoverContent,
  MacOSPopoverTrigger,
  MacOSTooltip,
  MacOSTooltipContent,
  MacOSTooltipTrigger,
} from '@/components/ui'
import { AgentAvatar, IconButton } from '@/components/common'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { useAgent } from '@/hooks/agents'
import {
  useCancelQuery,
  useClearSession,
  useDeleteSession,
  useResumeSession,
  useRunningSessions,
  useSendUserMessage,
  useSessionMessages,
  useSessions,
  useStopSession,
} from '@/hooks/sessions'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import { formatRelativeTime } from '@/lib/ui/formatters/time'
import type { Message, Session } from '@/lib/types'
import { MessageRenderer } from './MessageRenderer'
import { Composer } from './Composer'

interface SessionViewProps {
  session: Session
}

export function SessionView({ session }: SessionViewProps) {
  const navigate = useNavigate()
  const { data: agent } = useAgent(session.agentId)
  const { data: initialMessages = [], refetch } = useSessionMessages(session.id)
  const { data: running = [] } = useRunningSessions()
  const { data: allSessions = [] } = useSessions()
  const sendMessage = useSendUserMessage()
  const cancelQuery = useCancelQuery()
  const clearSession = useClearSession()
  const resumeSession = useResumeSession()
  const stopSession = useStopSession()
  const deleteSession = useDeleteSession()

  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'history'>('main')
  // Tracks whether a turn is currently being processed: set true on send,
  // cleared on `result`/`process_exit`. Drives the spinning status icon.
  const [turnBusy, setTurnBusy] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) setMenuView('main')
  }, [menuOpen])

  const status = useMemo(
    () => running.find((r) => r.sessionId === session.id)?.status,
    [running, session.id],
  )
  const isRunning = status === 'running'

  useEffect(() => {
    setLiveMessages([])
    setTurnBusy(false)
    refetch()
    if (!status) {
      void resumeSession.mutateAsync(session.id).catch((err) => {
        toast.error(`Could not resume session: ${err}`)
      })
    }
  }, [session.id])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    listen<Message>(`session:${session.id}:event`, (event) => {
      const msg = event.payload
      setLiveMessages((prev) => [...prev, msg])
      if (msg.kind === 'result' || msg.kind === 'process_exit') {
        setTurnBusy(false)
      }
    }).then((u) => {
      unlisten = u
    })
    return () => {
      unlisten?.()
    }
  }, [session.id])

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

  const siblingSessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.agentId === session.agentId && s.id !== session.id)
        .sort((a, b) => (b.visitedAt || b.updatedAt) - (a.visitedAt || a.updatedAt)),
    [allSessions, session.agentId, session.id],
  )

  const handleSend = async (text: string, attachments: any[]) => {
    if (!isRunning) {
      toast.error('Session is not running')
      return
    }
    setTurnBusy(true)
    try {
      await sendMessage.mutateAsync({ sessionId: session.id, text, attachments })
    } catch (err) {
      setTurnBusy(false)
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
    setMenuOpen(false)
    try {
      await cancelQuery.mutateAsync(session.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleClear = async () => {
    setMenuOpen(false)
    if (!confirm('Clear conversation context for this session?')) return
    try {
      await clearSession.mutateAsync(session.id)
      setLiveMessages([])
      setTurnBusy(false)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    if (!confirm('Delete this session and all its messages?')) return
    try {
      if (status) await stopSession.mutateAsync(session.id)
      await deleteSession.mutateAsync(session.id)
      navigate('/sessions')
    } catch (err) {
      toast.error(String(err))
    }
  }

  const { navigateToAgent } = useAppNavigation()

  return (
    <div className="flex flex-col h-full bg-background">
      <header
        data-tauri-drag-region
        className="border-b flex items-center justify-between bg-background backdrop-blur-sm select-none"
      >
        <div className="p-3 flex items-center gap-3 min-w-0">
          <div
            onClick={() => agent && navigateToAgent(agent.id)}
            className="hover:opacity-80 cursor-pointer"
          >
            <AgentAvatar agent={agent} size={36} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-sm flex items-center gap-1.5">
              <span
                className="cursor-pointer hover:opacity-75 truncate"
                onClick={() => agent && navigateToAgent(agent.id)}
              >
                {session.name || agent?.alias || 'Session'}
              </span>
              <StatusIcon status={status} busy={turnBusy} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[420px]">
              <span className="font-mono">{session.cwd}</span>
              <span className="mx-1.5 opacity-50">·</span>
              <span>{session.permissionMode}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3">
          <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
            {formatRelativeTime(session.visitedAt || session.updatedAt)}
          </span>
          <MacOSPopover open={menuOpen} onOpenChange={setMenuOpen}>
            <MacOSTooltip>
              <MacOSTooltipTrigger asChild>
                <div>
                  <MacOSPopoverTrigger asChild>
                    <IconButton>
                      <MoreHorizontal size={18} className="text-foreground" />
                    </IconButton>
                  </MacOSPopoverTrigger>
                </div>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="bottom">Session menu</MacOSTooltipContent>
            </MacOSTooltip>
            <MacOSPopoverContent align="end" sideOffset={6} className="w-64 p-1">
              {menuView === 'main' ? (
                <div>
                  <MenuItem
                    icon={<Square size={14} />}
                    label="Stop"
                    hint={isRunning ? 'Interrupt current turn' : 'Nothing running'}
                    disabled={!isRunning}
                    onClick={handleStop}
                  />
                  <MenuItem
                    icon={<Eraser size={14} />}
                    label="Clear"
                    hint="Reset conversation context"
                    onClick={handleClear}
                  />
                  <MenuItem
                    icon={<Clock size={14} />}
                    label="Session history"
                    hint={`${siblingSessions.length} other session${siblingSessions.length === 1 ? '' : 's'}`}
                    onClick={() => setMenuView('history')}
                    chevron
                  />
                  <div className="my-1 h-px bg-border/50" />
                  <MenuItem
                    icon={<Trash2 size={14} />}
                    label="Delete session"
                    hint="Removes all messages"
                    danger
                    onClick={handleDelete}
                  />
                </div>
              ) : (
                <SessionHistoryList
                  sessions={siblingSessions}
                  running={running}
                  onBack={() => setMenuView('main')}
                  onPick={(id) => {
                    setMenuOpen(false)
                    navigate(`/sessions/${id}`)
                  }}
                />
              )}
            </MacOSPopoverContent>
          </MacOSPopover>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {allMessages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            {isRunning
              ? 'Send your first message below.'
              : 'Subprocess is starting up…'}
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
        canCancel={isRunning && turnBusy}
      />
    </div>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  disabled,
  onClick,
  chevron,
  danger,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
  chevron?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'w-full px-2 py-1.5 rounded-md flex items-center gap-2.5 text-left',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-muted/60 cursor-pointer',
        danger && !disabled && 'hover:bg-red-500/10 text-red-600 dark:text-red-400',
      )}
    >
      <span
        className={cn(
          'flex-shrink-0',
          danger ? 'text-red-500/80' : 'text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
      </span>
      {chevron && (
        <ChevronLeft size={14} className="text-muted-foreground/60 rotate-180 flex-shrink-0" />
      )}
    </button>
  )
}

function SessionHistoryList({
  sessions,
  running,
  onPick,
  onBack,
}: {
  sessions: Session[]
  running: { sessionId: string; status: 'running' | 'stopped' | 'crashed' }[]
  onPick: (id: string) => void
  onBack: () => void
}) {
  return (
    <div className="max-h-80 overflow-y-auto">
      <button
        onClick={onBack}
        className="w-full px-2 py-1 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:bg-muted/40 rounded-md cursor-pointer"
      >
        <ChevronLeft size={12} /> Back
      </button>
      {sessions.length === 0 ? (
        <div className="px-3 py-6 text-xs text-muted-foreground text-center">
          No other sessions for this agent.
        </div>
      ) : (
        <>
          <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
            Other sessions
          </div>
          {sessions.map((s) => {
            const status = running.find((r) => r.sessionId === s.id)?.status
            return (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    status === 'running'
                      ? 'bg-emerald-500'
                      : status === 'crashed'
                        ? 'bg-red-500'
                        : 'bg-gray-400/60',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{s.name || s.cwd}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {s.cwd}
                    <span className="mx-1.5 opacity-50">·</span>
                    {formatRelativeTime(s.visitedAt || s.updatedAt)}
                  </div>
                </div>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

function StatusIcon({
  status,
  busy,
}: {
  status?: 'running' | 'stopped' | 'crashed'
  busy: boolean
}) {
  if (status === 'crashed') {
    return (
      <Tip text="Subprocess crashed">
        <AlertCircle size={14} className="text-red-500" />
      </Tip>
    )
  }
  if (!status) {
    return (
      <Tip text="Starting…">
        <Loader2 size={14} className="text-muted-foreground animate-spin" />
      </Tip>
    )
  }
  if (status === 'stopped') {
    return (
      <Tip text="Stopped">
        <CircleDashed size={14} className="text-muted-foreground/70" />
      </Tip>
    )
  }
  if (busy) {
    return (
      <Tip text="Running…">
        <Loader2 size={14} className="text-emerald-500 animate-spin" />
      </Tip>
    )
  }
  return (
    <Tip text="Ready">
      <CheckCircle2 size={14} className="text-emerald-500" />
    </Tip>
  )
}

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <MacOSTooltip>
      <MacOSTooltipTrigger asChild>
        <span className="inline-flex items-center">{children}</span>
      </MacOSTooltipTrigger>
      <MacOSTooltipContent side="bottom">{text}</MacOSTooltipContent>
    </MacOSTooltip>
  )
}
