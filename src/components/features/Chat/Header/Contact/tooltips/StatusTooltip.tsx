import { useContact } from '@/hooks/contacts/shared/query'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useGroupById } from '@/hooks/contacts/groups/query'
import { AgentStatusTooltip } from './AgentStatusTooltip'
import { GroupStatusTooltip } from './GroupStatusTooltip'

export function StatusTooltip({ contactId }: { contactId: string }) {
  const { data: contact } = useContact(contactId)
  if (!contact) return null

  const { data: agent } = useAgentById(contactId)
  const { data: group } = useGroupById(contactId)

  return (
    <>
      {contact.type === 'group'
        ? group && <GroupStatusTooltip group={group} />
        : agent && <AgentStatusTooltip agent={agent} />}
    </>
  )
}
