import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IoAddOutline, IoChatbubblesOutline, IoSettingsOutline } from 'react-icons/io5'
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { getVersion } from '@tauri-apps/api/app'
import { SidebarContainer } from '@/components/common'
import { Button } from '@/components/ui'
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import { useUpdater } from '@/components/features/Updater/useUpdater'
import { UpdateDialog } from '@/components/features/Updater/UpdateDialog'
import { useAgents } from '@/hooks/agents'
import { useRunningSessions, useSessions, useStartSession } from '@/hooks/sessions'
import { AgentCreationModal } from '@/components/features/Contacts/AgentCreationModal'
import { AgentEditor } from '@/components/features/Contacts/AgentEditor'
import { toast } from '@/lib/core/utils/toast'
import { useT } from '@/lib/i18n'
import type { Agent } from '@/lib/types'
import { AgentsList } from './AgentsList'
import { SessionView } from './SessionView'

export function SessionsView() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const navigate = useNavigate()
  const t = useT()
  const { data: agents = [], isLoading } = useAgents()
  const { data: sessions = [] } = useSessions()
  const { data: running = [] } = useRunningSessions()
  const startSession = useStartSession()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar.collapsed') === '1')

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar.collapsed', next ? '1' : '0')
      return next
    })

  const selected = sessionId ? sessions.find((s) => s.id === sessionId) : null
  const selectedAgentId = selected?.agentId

  // Agents that currently have a running session → green dot in the sidebar.
  const runningAgentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of sessions) {
      if (running.find((r) => r.sessionId === s.id && r.status === 'running')) ids.add(s.agentId)
    }
    return ids
  }, [sessions, running])

  const filtered = useMemo(
    () =>
      agents.filter((a) => {
        const q = search.toLowerCase()
        return a.alias.toLowerCase().includes(q) || a.cwd.toLowerCase().includes(q)
      }),
    [agents, search],
  )

  // Open an agent → its most recent session, or create one if it has none.
  const openAgent = async (agentId: string) => {
    const latest = sessions
      .filter((s) => s.agentId === agentId)
      .sort((a, b) => (b.visitedAt || b.updatedAt) - (a.visitedAt || a.updatedAt))[0]
    if (latest) {
      navigate(`/sessions/${latest.id}`)
      return
    }
    try {
      const s = await startSession.mutateAsync({ agentId, name: null })
      navigate(`/sessions/${s.id}`)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const keepLatest = editingAgent
    ? agents.find((a) => a.id === editingAgent.id) ?? editingAgent
    : null

  useEffect(() => {
    if (sessionId && !isLoading && !selected) {
      navigate('/sessions', { replace: true })
    }
  }, [sessionId, isLoading, selected, navigate])

  return (
    <div className="flex h-full">
      <SidebarContainer
        collapsed={collapsed}
        searchPlaceholder={t('ui.searchAgents')}
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        inlineAction={{
          icon: IoAddOutline,
          tooltip: t('agent.newAgent'),
          onClick: () => setCreating(true),
        }}
        footer={<SidebarFooter collapsed={collapsed} onToggle={toggleCollapsed} />}
      >
        <AgentsList
          agents={filtered}
          selectedAgentId={selectedAgentId}
          runningAgentIds={runningAgentIds}
          onSelect={openAgent}
          onEdit={setEditingAgent}
          onCreate={() => setCreating(true)}
          hasAnyAgent={agents.length > 0}
          collapsed={collapsed}
        />
      </SidebarContainer>

      <div className="flex-1 overflow-hidden">
        {selected ? (
          <SessionView session={selected} key={selected.id} />
        ) : (
          <AgentsEmptyState
            prominent={agents.length === 0}
            onCreate={() => setCreating(true)}
          />
        )}
      </div>

      {creating && (
        <AgentCreationModal
          onClose={() => setCreating(false)}
          onCreated={(agent) => {
            setCreating(false)
            void openAgent(agent.id)
          }}
        />
      )}

      {keepLatest && (
        <AgentEditor
          agent={keepLatest}
          onClose={() => setEditingAgent(null)}
          onDeleted={() => {
            if (selectedAgentId === keepLatest.id) navigate('/sessions')
          }}
        />
      )}
    </div>
  )
}

function SidebarFooter({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { updateAvailable, hasUpdate } = useUpdater()
  const t = useT()
  const [version, setVersion] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => {})
  }, [])

  const settingsBtn = (
    <button
      onClick={() => openSettingsWindow('agents')}
      title={t('ui.settings')}
      aria-label={t('ui.settings')}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <IoSettingsOutline size={16} />
    </button>
  )

  const toggleBtn = (
    <button
      onClick={onToggle}
      title={collapsed ? t('ui.expandSidebar') : t('ui.collapseSidebar')}
      aria-label={collapsed ? t('ui.expandSidebar') : t('ui.collapseSidebar')}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
    </button>
  )

  if (collapsed) {
    return (
      <div className="flex items-center justify-center gap-1">
        {settingsBtn}
        {toggleBtn}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-1">
      {settingsBtn}

      <div className="flex items-center gap-1">
        <span className="select-none text-[11px] tabular-nums">
          {hasUpdate && updateAvailable ? (
            <>
              <button
                onClick={() => setShowDialog(true)}
                className="text-interactive hover:underline"
              >
                {t('ui.update')} v{updateAvailable.version}
              </button>
              <UpdateDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                update={updateAvailable}
              />
            </>
          ) : (
            version && <span className="text-muted-foreground/50">v{version}</span>
          )}
        </span>
        {toggleBtn}
      </div>
    </div>
  )
}

function AgentsEmptyState({ prominent, onCreate }: { prominent: boolean; onCreate: () => void }) {
  const t = useT()
  return (
    <div
      data-tauri-drag-region
      className="h-full flex flex-col items-center justify-center text-center px-8 select-none"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-muted-foreground mb-5">
        <IoChatbubblesOutline size={30} />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1.5">
        {prominent ? t('agent.noAgentsTitle') : t('agent.pickTitle')}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        {prominent ? t('agent.emptyHint') : t('agent.pickHint')}
      </p>
      {prominent && (
        <Button onClick={onCreate} className="flex items-center gap-1.5 px-5">
          <IoAddOutline size={16} />
          {t('agent.newAgent')}
        </Button>
      )}
    </div>
  )
}
