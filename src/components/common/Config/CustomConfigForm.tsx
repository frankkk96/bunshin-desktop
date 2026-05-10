import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingInput } from '@/components/features/Settings/components/SettingInput'
import { SettingSelect } from '@/components/features/Settings/components/SettingSelect'
import { MacOSSwitch, MacOSTextarea } from '@/components/ui'
import { Hash, Type, ToggleLeft } from 'lucide-react'
import { SettingDivider } from '@/components/features/Settings/components/SettingDivider'
import type { ConfigSchema, ConfigValue, SchemaField } from '@/lib/core/config/types'

interface CustomConfigFormProps {
  schema: ConfigSchema
  values: ConfigValue
  onChange: (key: string, value: any) => void
}

export function CustomConfigForm({ schema, values, onChange }: CustomConfigFormProps) {
  const renderField = (key: string, field: SchemaField) => {
    if (!field || typeof field !== 'object') return null

    // Distinguish between default value and placeholder
    // If values[key] exists, use it; otherwise use default if available
    const hasValue = key in values
    const currentValue = (hasValue ? values[key] : field.default) as
      | string
      | number
      | boolean
      | undefined
    const placeholder = field.placeholder || ''
    const displayName =
      field.label || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

    // Build description with constraints
    let description = field.description || ''
    if (field.minimum !== undefined || field.maximum !== undefined) {
      const constraints = []
      if (field.minimum !== undefined) constraints.push(`Min: ${field.minimum}`)
      if (field.maximum !== undefined) constraints.push(`Max: ${field.maximum}`)
      const constraintText = `(${constraints.join(', ')})`
      description = description ? `${description} ${constraintText}` : constraintText
    }

    // Get appropriate icon for field type
    const getIcon = () => {
      switch (field.type) {
        case 'integer':
        case 'number':
          return <Hash className="w-4 h-4" />
        case 'boolean':
          return <ToggleLeft className="w-4 h-4" />
        default:
          return <Type className="w-4 h-4" />
      }
    }

    switch (field.type) {
      case 'integer':
      case 'number':
        return (
          <SettingRow icon={getIcon()} title={displayName} description={description}>
            <SettingInput
              type="number"
              value={currentValue !== undefined ? (currentValue as number) : ''}
              placeholder={placeholder}
              onChange={(value) => {
                if (value === '') {
                  // Empty string means user cleared the field
                  onChange(key, undefined)
                } else {
                  let parsedValue = field.type === 'integer' ? parseInt(value) : parseFloat(value)
                  onChange(key, isNaN(parsedValue) ? undefined : parsedValue)
                }
              }}
              onBlur={(e) => {
                // Clamp value to min/max bounds on blur
                let value =
                  field.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value)

                if (!isNaN(value)) {
                  if (field.minimum !== undefined && value < field.minimum) {
                    onChange(key, field.minimum)
                  } else if (field.maximum !== undefined && value > field.maximum) {
                    onChange(key, field.maximum)
                  }
                }
              }}
              min={field.minimum}
              max={field.maximum}
              step={field.type === 'integer' ? 1 : 0.1}
              className="w-24"
            />
          </SettingRow>
        )

      case 'string':
        if (field.enum) {
          return (
            <SettingRow icon={getIcon()} title={displayName} description={description}>
              <SettingSelect
                value={(currentValue as string) || ''}
                onValueChange={(value) => onChange(key, value)}
                options={field.enum.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
            </SettingRow>
          )
        } else if (field.multiline) {
          return (
            <SettingRow icon={getIcon()} title={displayName} description={description}>
              <MacOSTextarea
                value={currentValue !== undefined ? (currentValue as string) : ''}
                onChange={(e) => onChange(key, e.target.value || undefined)}
                placeholder={placeholder || 'Enter values, one per line'}
                className="min-h-[80px]"
              />
            </SettingRow>
          )
        } else {
          return (
            <SettingRow icon={getIcon()} title={displayName} description={description}>
              <SettingInput
                type="text"
                value={currentValue !== undefined ? (currentValue as string) : ''}
                placeholder={placeholder}
                onChange={(value) => onChange(key, value || undefined)}
              />
            </SettingRow>
          )
        }

      case 'boolean':
        return (
          <SettingRow icon={getIcon()} title={displayName} description={description}>
            <MacOSSwitch
              checked={(currentValue as boolean) || false}
              onCheckedChange={(checked: boolean) => onChange(key, checked)}
            />
          </SettingRow>
        )

      default:
        return (
          <SettingRow icon={getIcon()} title={displayName} description={description}>
            <SettingInput
              type="text"
              value={currentValue !== undefined ? String(currentValue) : ''}
              placeholder={placeholder}
              onChange={(value) => onChange(key, value || undefined)}
            />
          </SettingRow>
        )
    }
  }

  return (
    <div>
      {Object.entries(schema).map(([key, field], index) => {
        const renderedField = renderField(key, field)
        return renderedField ? (
          <div key={key}>
            {renderedField}
            {index < Object.entries(schema).length - 1 && <SettingDivider />}
          </div>
        ) : null
      })}
    </div>
  )
}
