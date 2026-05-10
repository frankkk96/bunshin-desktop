export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object'
  label: string
  description?: string
  default?: unknown
  enum?: string[]
  placeholder?: string
  minimum?: number
  maximum?: number
  required?: boolean
  multiline?: boolean
}

export type ConfigSchema = { [key: string]: SchemaField }

export type ConfigValue = Record<string, unknown>
