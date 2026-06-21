import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IoAddOutline, IoChatbubblesOutline } from 'react-icons/io5'
import { SidebarContainer } from '@/components/common'
import { MacOSButton } from '@/components/ui'
import { useSessions } from '@/hooks/sessions'
import { SessionsList } from './SessionsList'
import { SessionView } from './SessionView'
import { StartSessionModal } from './StartSessionModal'

export function SessionsView() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: sessions = [], isLoading } = useSessions()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationDefaultAgentId, setCreationDefaultAgentId] = useState<string | undefined>()

  // Open the creation modal when navigated here with `?createFor=<agentId>`,
  // then strip the query so back/forward doesn't re-open it.
  useEffect(() => {
    const createFor = searchParams.get('createFor')
    if (createFor) {
      setCreationDefaultAgentId(createFor)
      setCreating(true)
      const next = new URLSearchParams(searchParams)
      next.delete('createFor')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        const label = (s.name ?? s.cwd ?? '').toLowerCase()
        return label.includes(search.toLowerCase())
      }),
    [sessions, search],
  )

  const openCreate = () => {
    setCreationDefaultAgentId(undefined)
    setCreating(true)
  }

  const selected = sessionId ? sessions.find((s) => s.id === sessionId) : null

  useEffect(() => {
    if (sessionId && !isLoading && !selected) {
      navigate('/sessions', { replace: true })
    }
  }, [sessionId, isLoading, selected, navigate])

  return (
    <div className="flex h-full">
      <SidebarContainer
        title="Sessions"
        searchPlaceholder="Search sessions"
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        actionButton={{
          icon: IoAddOutline,
          tooltip: 'Create Session',
          onClick: openCreate,
        }}
      >
        <SessionsList
          sessions={filtered}
          selectedId={sessionId}
          onSelect={(id) => navigate(`/sessions/${id}`)}
          onCreate={openCreate}
          hasAnySession={sessions.length > 0}
        />
      </SidebarContainer>

      <div className="flex-1 overflow-hidden">
        {selected ? (
          <SessionView session={selected} key={selected.id} />
        ) : (
          <SessionsEmptyState
            prominent={sessions.length === 0}
            onCreate={openCreate}
          />
        )}
      </div>

      {creating && (
        <StartSessionModal
          defaultAgentId={creationDefaultAgentId}
          onClose={() => setCreating(false)}
          onStarted={(s) => {
            setCreating(false)
            navigate(`/sessions/${s.id}`)
          }}
        />
      )}
    </div>
  )
}

function SessionsEmptyState({
  prominent,
  onCreate,
}: {
  prominent: boolean
  onCreate: () => void
}) {
  return (
    <div
      data-tauri-drag-region
      className="h-full flex flex-col items-center justify-center text-center px-8 select-none"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-muted-foreground mb-5">
        <IoChatbubblesOutline size={30} />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1.5">
        {prominent ? 'No sessions yet' : 'No session selected'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        {prominent
          ? 'Start a Claude Code session in a project folder to begin chatting with an agent.'
          : 'Pick a session on the left, or create a new one.'}
      </p>
      <MacOSButton onClick={onCreate} className="flex items-center gap-1.5 px-5">
        <IoAddOutline size={16} />
        Create Session
      </MacOSButton>
    </div>
  )
}
