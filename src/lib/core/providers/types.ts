import { ConfigSchema } from '../config/types'

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'pdf'

export interface Model {
  id: string
  name: string
  attachment: boolean
  reasoning: boolean
  toolCall: boolean
  temperature: boolean
  knowledge: string
  releaseDate: string
  lastUpdated: string
  modalities: {
    input: Modality[]
    output: Modality[]
  }
  openWeights: boolean
  cost: {
    input: number
    output: number
  }
  limit: {
    context: number
    output: number
  }
  configSchema?: ConfigSchema
  // Runtime fields (not from JSON config)
  provider?: string
  userModified?: boolean
}
