import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IoAddOutline } from 'react-icons/io5'
import { SidebarContainer, NotFoundView } from '@/components/common'
import { useAgents } from '@/hooks/agents'
import { ContactsList } from './ContactsList'
import { AgentDetail } from './AgentDetail'
import { AgentCreationModal } from './AgentCreationModal'

export function ContactsView() {
  const { contactId } = useParams<{ contactId?: string }>()
  const navigate = useNavigate()
  const { data: agents = [], isLoading } = useAgents()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = agents.filter((a) =>
    a.alias.toLowerCase().includes(search.toLowerCase()),
  )

  const selected = contactId ? agents.find((a) => a.id === contactId) : null

  return (
    <div className="flex h-full">
      <SidebarContainer
        title="Contacts"
        searchPlaceholder="Search agents"
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        actionButton={{
          icon: IoAddOutline,
          tooltip: 'New Agent',
          onClick: () => setCreating(true),
        }}
      >
        <ContactsList
          agents={filtered}
          selectedId={contactId}
          onSelect={(id) => navigate(`/contacts/${id}`)}
        />
      </SidebarContainer>

      <div className="flex-1 overflow-hidden">
        {selected ? (
          <AgentDetail agent={selected} />
        ) : (
          <NotFoundView entityType="Agent" message="Pick an agent on the left to inspect or edit." />
        )}
      </div>

      {creating && (
        <AgentCreationModal
          onClose={() => setCreating(false)}
          onCreated={(agent) => {
            setCreating(false)
            navigate(`/contacts/${agent.id}`)
          }}
        />
      )}
    </div>
  )
}
