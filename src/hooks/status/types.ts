import { ExtensionStatus } from '../../lib/core/extensions/types'
import { Model } from '@/lib/core/providers/types'

export enum ConnectionStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
  Disabled = 'disabled',
}

export interface AgentStatusData {
  id: string
  name: string
  isReady: boolean
  providerId?: string
  providerConfigured?: boolean
  providerModels?: Model[]
  currentModelId?: string
  extensions?: ExtensionStatus[]
  issues: string[]
}

export interface GroupStatusData {
  isReady: boolean
  agents: AgentStatusData[]
}
