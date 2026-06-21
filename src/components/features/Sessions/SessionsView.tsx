import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IoAddOutline, IoChatbubblesOutline, IoSettingsOutline } from 'react-icons/io5'
import { Download } from 'lucide-react'
import { getVersion } from '@tauri-apps/api/app'
import { SidebarContainer } from '@/components/common'
import { Button } from '@/components/ui'
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import { useUpdater } from '@/components/features/Updater/useUpdater'
import { UpdateDialog } from '@/components/features/Updater/UpdateDialog'
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
        searchPlaceholder="Search"
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        inlineAction={{
          icon: IoAddOutline,
          tooltip: 'New Session',
          onClick: openCreate,
        }}
        footer={<SidebarFooter />}
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

function SidebarFooter() {
  const { updateAvailable, hasUpdate } = useUpdater()
  const [version, setVersion] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => {})
  }, [])

  return (
    <div className="flex items-center justify-between gap-1">
      <button
        onClick={() => openSettingsWindow('agents')}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <IoSettingsOutline size={15} />
        Settings
      </button>

      {hasUpdate && updateAvailable ? (
        <>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-interactive hover:bg-interactive/10 transition-colors"
            title={`Update available: v${updateAvailable.version}`}
          >
            <Download size={13} />
            Update
          </button>
          <UpdateDialog open={showDialog} onOpenChange={setShowDialog} update={updateAvailable} />
        </>
      ) : (
        version && <span className="text-[11px] text-muted-foreground/70 pr-1.5">v{version}</span>
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
      <Button onClick={onCreate} className="flex items-center gap-1.5 px-5">
        <IoAddOutline size={16} />
        Create Session
      </Button>
    </div>
  )
}
