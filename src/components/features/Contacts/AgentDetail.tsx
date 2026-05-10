import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DetailLayout } from '@/components/common/Layout/DetailLayout'
import { DeleteButton } from '@/components/common/Buttons/DeleteButton'
import { MacOSButton, MacOSInput, MacOSLabel } from '@/components/ui'
import { useDeleteAgent, useUpdateAgent } from '@/hooks/agents'
import { useProvider } from '@/hooks/providers'
import { toast } from '@/lib/core/utils/toast'
import type { Agent } from '@/lib/types'

interface AgentDetailProps {
  agent: Agent
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const navigate = useNavigate()
  const { data: provider } = useProvider(agent.providerId)
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()

  const [alias, setAlias] = useState(agent.alias)
  const [description, setDescription] = useState(agent.description ?? '')
  const [avatar, setAvatar] = useState(agent.avatar ?? '')

  useEffect(() => {
    setAlias(agent.alias)
    setDescription(agent.description ?? '')
    setAvatar(agent.avatar ?? '')
  }, [agent.id])

  const dirty =
    alias !== agent.alias ||
    description !== (agent.description ?? '') ||
    avatar !== (agent.avatar ?? '')

  const handleSave = async () => {
    if (!alias.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    await updateAgent.mutateAsync({
      id: agent.id,
      alias: alias.trim(),
      description: description.trim() || null,
      avatar: avatar.trim() || null,
      pinned: agent.pinned,
    })
    toast.success('Agent updated')
  }

  const handleDelete = async () => {
    try {
      await deleteAgent.mutateAsync(agent.id)
      navigate('/contacts')
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <DetailLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 flex items-center justify-center rounded-full bg-muted text-2xl">
            {avatar || alias.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{agent.alias}</h1>
            <p className="text-sm text-muted-foreground">
              {provider ? `${provider.name} · ${provider.type}` : 'Loading provider…'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <MacOSLabel>Name</MacOSLabel>
            <MacOSInput value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>

          <div>
            <MacOSLabel>Avatar (emoji or short text)</MacOSLabel>
            <MacOSInput
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="🤖"
              maxLength={4}
            />
          </div>

          <div>
            <MacOSLabel>Description</MacOSLabel>
            <MacOSInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this agent is for"
            />
          </div>

          <div>
            <MacOSLabel>Provider</MacOSLabel>
            <MacOSInput value={provider?.name ?? agent.providerId} disabled />
            <p className="text-xs text-muted-foreground mt-1">
              Provider can not be changed after creation.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <DeleteButton text="Delete agent" onDelete={handleDelete} />
          <MacOSButton onClick={handleSave} disabled={!dirty || updateAgent.isPending}>
            {updateAgent.isPending ? 'Saving…' : 'Save changes'}
          </MacOSButton>
        </div>
      </div>
    </DetailLayout>
  )
}
