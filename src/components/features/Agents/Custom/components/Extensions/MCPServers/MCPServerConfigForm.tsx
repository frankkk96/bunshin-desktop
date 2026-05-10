import { MacOSInput } from '@/components/ui'
import type { MCPServerBuilder } from '@/lib/core/extensions/mcp-servers/builder/base'
import { Plus, X } from 'lucide-react'

interface MCPServerConfigFormProps {
  config: Record<string, any>
  selectedBuilder: MCPServerBuilder | null
  onConfigChange: (config: Record<string, any>) => void
}

export function MCPServerConfigForm({
  config,
  selectedBuilder,
  onConfigChange,
}: MCPServerConfigFormProps) {
  if (!selectedBuilder) return null

  const schema = selectedBuilder.configSchema

  const handleArrayItemChange = (fieldName: string, index: number, value: any) => {
    const currentArray = Array.isArray(config[fieldName]) ? [...config[fieldName]] : []
    currentArray[index] = value
    onConfigChange({ ...config, [fieldName]: currentArray })
  }

  const handleArrayItemRemove = (fieldName: string, index: number) => {
    const currentArray = Array.isArray(config[fieldName]) ? [...config[fieldName]] : []
    currentArray.splice(index, 1)
    onConfigChange({ ...config, [fieldName]: currentArray })
  }

  const handleArrayItemAdd = (fieldName: string) => {
    const currentArray = Array.isArray(config[fieldName]) ? [...config[fieldName]] : []

    // Check if this is env array (array of objects with key/value)
    if (fieldName === 'env') {
      currentArray.push({ key: '', value: '' })
    } else {
      // Regular string array
      currentArray.push('')
    }

    onConfigChange({ ...config, [fieldName]: currentArray })
  }

  return (
    <div className="space-y-4">
      {Object.entries(schema).map(([fieldName, fieldSchema]) => (
        <div key={fieldName} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {fieldSchema.type === 'string' && (
            <MacOSInput
              value={(config[fieldName] as string) || ''}
              onChange={(e) => onConfigChange({ ...config, [fieldName]: e.target.value })}
              placeholder={`Enter ${fieldName}`}
              className="w-full"
            />
          )}

          {fieldSchema.type === 'array' && (
            <div className="space-y-2">
              {fieldName === 'env' ? (
                // Environment variables (key-value pairs)
                <>
                  {((config[fieldName] as Array<{ key: string; value: string }>) || []).map(
                    (item, index) => (
                      <div key={index} className="flex gap-2">
                        <MacOSInput
                          value={item.key}
                          onChange={(e) =>
                            handleArrayItemChange(fieldName, index, {
                              ...item,
                              key: e.target.value,
                            })
                          }
                          placeholder="KEY"
                          className="flex-1"
                        />
                        <MacOSInput
                          value={item.value}
                          onChange={(e) =>
                            handleArrayItemChange(fieldName, index, {
                              ...item,
                              value: e.target.value,
                            })
                          }
                          placeholder="value"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleArrayItemRemove(fieldName, index)}
                          className="p-2 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ),
                  )}
                </>
              ) : (
                // Regular string arrays (args, etc.)
                <>
                  {((config[fieldName] as string[]) || []).map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <MacOSInput
                        value={item}
                        onChange={(e) => handleArrayItemChange(fieldName, index, e.target.value)}
                        placeholder={`Enter ${fieldName}`}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleArrayItemRemove(fieldName, index)}
                        className="p-2 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}

              <button
                type="button"
                onClick={() => handleArrayItemAdd(fieldName)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add{' '}
                {fieldName === 'env'
                  ? 'Environment Variable'
                  : fieldName.charAt(0).toUpperCase() + fieldName.slice(1).slice(0, -1)}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
