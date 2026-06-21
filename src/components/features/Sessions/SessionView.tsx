import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  Pencil,
  Square,
  SquarePen,
  Star,
  Trash2,
} from 'lucide-react'
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui'
import { AgentAvatar } from '@/components/common'
import { useAgent } from '@/hooks/agents'
import {
  useCancelQuery,
  useDeleteSession,
  useRenameSession,
  useResumeSession,
  useRunningSessions,
  useSendUserMessage,
  useSessionMessages,
  useSessions,
  useSetSessionFavorite,
  useStartSession,
  useStopSession,
} from '@/hooks/sessions'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import { formatRelativeTime } from '@/lib/ui/formatters/time'
import { useT } from '@/lib/i18n'
import type { Message, Session } from '@/lib/types'
import { AgentEditor } from '@/components/features/Contacts/AgentEditor'
import { MessageRenderer } from './MessageRenderer'
import { Composer } from './Composer'
import { PermissionProvider, hasPendingPermission } from './PermissionRequestCard'

interface SessionViewProps {
  session: Session
}

export function SessionView({ session }: SessionViewProps) {
  const navigate = useNavigate()
  const t = useT()
  const { data: agent } = useAgent(session.agentId)
  const { data: initialMessages = [], refetch } = useSessionMessages(session.id)
  const { data: running = [] } = useRunningSessions()
  const { data: allSessions = [] } = useSessions()
  const sendMessage = useSendUserMessage()
  const cancelQuery = useCancelQuery()
  const resumeSession = useResumeSession()
  const stopSession = useStopSession()
  const deleteSession = useDeleteSession()
  const startSession = useStartSession()
  const renameSession = useRenameSession()
  const setFavorite = useSetSessionFavorite()
  const [editingAgent, setEditingAgent] = useState(false)

  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  // Tracks whether a turn is currently being processed: set true on send,
  // cleared on `result`/`process_exit`. Drives the spinning status icon.
  const [turnBusy, setTurnBusy] = useState(false)
  // Live "running for Xs" timer shown next to the spinner during a turn.
  const turnStartRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!turnBusy) {
      turnStartRef.current = null
      return
    }
    turnStartRef.current = Date.now()
    setElapsed(0)
    const id = setInterval(() => {
      if (turnStartRef.current != null) setElapsed((Date.now() - turnStartRef.current) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [turnBusy])

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
        toast.error(`${t('session.couldNotResume')}: ${err}`)
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

  // The model actually in use is reported by the subprocess `system` init event;
  // fall back to the agent's configured model before the process has booted.
  const currentModel = useMemo(() => {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const m = allMessages[i]
      if (m.kind === 'system' && m.payload?.model) return String(m.payload.model)
    }
    return agent?.config?.model || undefined
  }, [allMessages, agent])

  const pendingPermission = useMemo(
    () => hasPendingPermission(allMessages),
    [allMessages],
  )


  // All sessions for this agent (incl. the current one) — the history list.
  const agentSessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.agentId === session.agentId)
        .sort((a, b) => (b.visitedAt || b.updatedAt) - (a.visitedAt || a.updatedAt)),
    [allSessions, session.agentId],
  )

  const handleSend = async (text: string, attachments: any[]) => {
    if (!isRunning) {
      toast.error(t('session.notRunning'))
      return
    }
    setTurnBusy(true)
    // Title the session with the first user message (if not named yet).
    if (!session.name && !allMessages.some((m) => m.kind === 'local_user') && text.trim()) {
      void renameSession
        .mutateAsync({ id: session.id, name: text.trim().slice(0, 80) })
        .catch(() => {})
    }
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

  const handleNewSession = async () => {
    setHistoryOpen(false)
    try {
      const s = await startSession.mutateAsync({ agentId: session.agentId, name: null })
      navigate(`/sessions/${s.id}`)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm(t('session.deleteConfirm'))) return
    try {
      if (running.find((r) => r.sessionId === id)?.status) {
        await stopSession.mutateAsync(id)
      }
      await deleteSession.mutateAsync(id)
      if (id === session.id) navigate('/sessions')
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleRenameSession = (id: string, name: string) =>
    renameSession.mutateAsync({ id, name: name.trim() || null }).catch((e) => toast.error(String(e)))

  const handleToggleFavorite = (id: string, favorite: boolean) =>
    setFavorite.mutateAsync({ id, favorite }).catch((e) => toast.error(String(e)))

  return (
    <div className="flex flex-col h-full bg-background">
      <header
        data-tauri-drag-region
        className="border-b flex items-center justify-between bg-background backdrop-blur-sm select-none"
      >
        <div className="p-3 flex items-center gap-3 min-w-0">
          <div
            onClick={() => setEditingAgent(true)}
            className="hover:opacity-80 cursor-pointer"
            title={t('agent.editTooltip')}
          >
            <AgentAvatar agent={agent} size={36} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-sm flex items-center gap-1.5">
              <span
                className="cursor-pointer hover:opacity-75 truncate"
                onClick={() => setEditingAgent(true)}
                title={t('agent.editTooltip')}
              >
                {agent?.alias || session.name || 'Agent'}
              </span>
              <StatusIcon status={status} busy={turnBusy} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[420px]">
              <span className="font-mono">{agent?.cwd}</span>
              {currentModel && (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  <span className="font-mono">{currentModel}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="icon" onClick={handleNewSession} aria-label={t('session.new')}>
                <SquarePen size={17} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('session.new')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="icon" onClick={() => setHistoryOpen(true)} aria-label={t('session.history')}>
                <Clock size={17} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('session.history')}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {historyOpen && (
        <HistoryDialog
          sessions={agentSessions}
          currentId={session.id}
          running={running}
          onClose={() => setHistoryOpen(false)}
          onOpen={(id) => {
            setHistoryOpen(false)
            navigate(`/sessions/${id}`)
          }}
          onDelete={handleDeleteSession}
          onRename={handleRenameSession}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      <PermissionProvider
        sessionId={session.id}
        isRunning={isRunning}
        messages={allMessages}
      >
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {allMessages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              {isRunning ? t('session.firstMessage') : t('session.starting')}
            </div>
          )}
          {allMessages.map((m) => (
            <MessageRenderer key={m.id} message={m} />
          ))}
          {turnBusy && (
            <div className="flex items-center gap-2 pl-1 text-[11px] text-muted-foreground/70">
              <Loader2 size={13} className="animate-spin" />
              <span className="tabular-nums">{elapsed.toFixed(1)}s</span>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Square size={9} className="fill-current" />
                {t('session.stop')}
              </button>
            </div>
          )}
        </div>
      </PermissionProvider>

      <Composer
        disabled={!isRunning || pendingPermission}
        disabledHint={pendingPermission ? t('composer.resolvePermission') : undefined}
        onSend={handleSend}
        onCancel={handleCancel}
        canCancel={isRunning && turnBusy}
      />

      {editingAgent && agent && (
        <AgentEditor
          agent={agent}
          onClose={() => setEditingAgent(false)}
          onDeleted={() => navigate('/sessions')}
        />
      )}
    </div>
  )
}

function HistoryDialog({
  sessions,
  currentId,
  running,
  onClose,
  onOpen,
  onDelete,
  onRename,
  onToggleFavorite,
}: {
  sessions: Session[]
  currentId: string
  running: { sessionId: string; status: 'running' | 'stopped' | 'crashed' }[]
  onClose: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onToggleFavorite: (id: string, favorite: boolean) => void
}) {
  const t = useT()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  // Pinned sessions float to the top.
  const ordered = [...sessions].sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1
    return (b.visitedAt || b.updatedAt) - (a.visitedAt || a.updatedAt)
  })

  const commitRename = (id: string) => {
    onRename(id, draft)
    setEditingId(null)
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="520px" height="600px">
      <SheetHeader>
        <SheetTitle>{t('session.listTitle')}</SheetTitle>
      </SheetHeader>
      <SheetContent className="px-3 py-3">
        {ordered.length === 0 ? (
          <div className="px-3 py-10 text-sm text-muted-foreground text-center">
            {t('session.none')}
          </div>
        ) : (
          <div className="space-y-0.5">
            {ordered.map((s) => {
              const status = running.find((r) => r.sessionId === s.id)?.status
              const isCurrent = s.id === currentId
              const editing = editingId === s.id
              return (
                <div
                  key={s.id}
                  className={cn(
                    'group flex items-center gap-2 px-2 py-2 rounded-lg',
                    isCurrent ? 'bg-accent/60' : 'hover:bg-muted/50',
                  )}
                >
                  <button
                    onClick={() => onToggleFavorite(s.id, !s.favorite)}
                    title={s.favorite ? t('session.unpin') : t('session.pin')}
                    className={cn(
                      'flex-shrink-0 p-1 rounded transition-colors',
                      s.favorite
                        ? 'text-amber-500'
                        : 'text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <Star size={14} className={s.favorite ? 'fill-current' : ''} />
                  </button>

                  {editing ? (
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitRename(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(s.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1"
                    />
                  ) : (
                    <button
                      onClick={() => onOpen(s.id)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="text-sm truncate flex items-center gap-1.5">
                        {s.name || t('session.unnamed')}
                        {status === 'running' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(s.visitedAt || s.updatedAt)}
                        {isCurrent && <span className="ml-1.5 opacity-70">· {t('session.current')}</span>}
                      </div>
                    </button>
                  )}

                  {!editing && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setDraft(s.name ?? '')
                          setEditingId(s.id)
                        }}
                        title={t('session.rename')}
                        className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        title={t('common.delete')}
                        className="p-1 rounded text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatusIcon({
  status,
  busy,
}: {
  status?: 'running' | 'stopped' | 'crashed'
  busy: boolean
}) {
  const t = useT()
  if (status === 'crashed') {
    return (
      <Tip text={t('status.crashed')}>
        <AlertCircle size={14} className="text-red-500" />
      </Tip>
    )
  }
  if (!status) {
    return (
      <Tip text={t('status.starting')}>
        <Loader2 size={14} className="text-muted-foreground animate-spin" />
      </Tip>
    )
  }
  if (status === 'stopped') {
    return (
      <Tip text={t('status.stopped')}>
        <CircleDashed size={14} className="text-muted-foreground/70" />
      </Tip>
    )
  }
  if (busy) {
    return (
      <Tip text={t('status.running')}>
        <Loader2 size={14} className="text-emerald-500 animate-spin" />
      </Tip>
    )
  }
  return (
    <Tip text={t('status.ready')}>
      <CheckCircle2 size={14} className="text-emerald-500" />
    </Tip>
  )
}

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{text}</TooltipContent>
    </Tooltip>
  )
}
