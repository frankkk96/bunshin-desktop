import { GroupDetail } from '@/components/features/Groups'
import { AgentOverview } from '../Agents/AgentOverview'
import { useContact } from '@/hooks/contacts/shared/query'

interface ContactDetailProps {
  contactId: string
}

export function ContactDetail({ contactId }: ContactDetailProps) {
  const { data: contact, isLoading, error } = useContact(contactId)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading contact...
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-destructive">
        Failed to load contact
      </div>
    )
  }

  // If it's a group, render GroupDetail instead
  if (contact?.type === 'group') {
    return <GroupDetail groupId={contactId} />
  }

  // If it's an agent, render AgentDetail instead
  if (contact?.type === 'agent') {
    return <AgentOverview agentId={contactId} />
  }

  // Neither agent nor group found
  return (
    <div className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground bg-background">
      <div className="text-lg font-semibold">Contact not found</div>
      <div className="text-sm">The selected contact could not be found</div>
    </div>
  )
}
