import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { SidebarContainer } from '@/components/common'
import { IoPersonAddOutline } from 'react-icons/io5'
import { useAllAgents } from '@/hooks/contacts/agents/query'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { Agent } from '@/lib/core/agent/types'
import { agentId } from '@/lib/core/utils/random'
import { ContactList } from './ContactList'
import { ContactDetail } from './ContactDetail'
import { AgentCreationModal, AgentCreationData } from './AgentCreationModal'
import { handleRuntimeError } from '@/lib/core/utils/error'

export function ContactsView() {
  const { contactId } = useParams<{ contactId?: string }>()
  const { navigateToContact } = useAppNavigation()

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { isLoading } = useAllAgents()
  const { createAgent } = useAgentMutations()

  const handleSelectContact = (id: string | null) => {
    navigateToContact(id || undefined)
  }

  const handleCreateAgent = (data: AgentCreationData) => {
    const newAgent: Agent = {
      id: agentId(),
      alias: data.name,
      description: `${data.providerName} | ${data.modelName}`,
      pinned: false,
      llm: {
        providerId: data.providerId,
        modelId: data.modelId,
      },
      prompt: {
        systemPrompt: '',
        shortcuts: [],
      },
      extension: {
        mcpServers: [],
        skipPermission: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    createAgent.mutate(newAgent, {
      onSuccess: () => {
        setIsCreateModalOpen(false)
        navigateToContact(newAgent.id)
      },
      onError: (error) => {
        handleRuntimeError(error, { message: 'Failed to create agent' })
      },
    })
  }

  return (
    <>
      <div className="flex h-full overflow-hidden rounded-br-xl">
        {/* Contact List Panel */}
        <div className="relative h-full">
          <SidebarContainer
            title="Contacts"
            headerIcon={<IoPersonAddOutline size={18} />}
            headerIconTooltip="New contact"
            onHeaderIconClick={() => setIsCreateModalOpen(true)}
            searchPlaceholder="Search contacts..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          >
            <ContactList
              searchValue={searchQuery}
              selectedContactId={contactId || null}
              onSelectContact={handleSelectContact}
            />
          </SidebarContainer>
        </div>

        {/* Contact Detail Panel */}
        <div className="flex-1 overflow-hidden bg-background">
          {contactId ? (
            <ContactDetail contactId={contactId} />
          ) : (
            <div className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground">
              <div className="text-lg font-semibold">
                {isLoading ? 'Loading contacts...' : 'No contacts found'}
              </div>
              <div className="text-sm">
                {isLoading
                  ? 'Please wait...'
                  : searchQuery
                    ? 'Try adjusting your search'
                    : 'Create your first contact to get started'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Creation Modal */}
      <AgentCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateAgent}
        isCreating={createAgent.isPending}
      />
    </>
  )
}
