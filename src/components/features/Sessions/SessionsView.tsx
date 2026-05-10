import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IoAddOutline } from 'react-icons/io5'
import { SidebarContainer, NotFoundView } from '@/components/common'
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
          onClick: () => {
            setCreationDefaultAgentId(undefined)
            setCreating(true)
          },
        }}
      >
        <SessionsList
          sessions={filtered}
          selectedId={sessionId}
          onSelect={(id) => navigate(`/sessions/${id}`)}
        />
      </SidebarContainer>

      <div className="flex-1 overflow-hidden">
        {selected ? (
          <SessionView session={selected} key={selected.id} />
        ) : (
          <NotFoundView
            entityType="Session"
            message="Pick a session on the left or create a new one."
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
