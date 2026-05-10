import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Plus, Trash2, Check, Eye, EyeOff } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  MacOSButton,
  MacOSSheet,
  MacOSSheetContent,
  MacOSInput,
  MacOSScrollArea,
  MacOSSelect,
  MacOSSelectContent,
  MacOSSelectItem,
  MacOSSelectTrigger,
  MacOSSelectValue,
} from '@/components/ui'
import { ProviderIcon } from '@/components/common/Icons/ProviderIcon'
import { IconPicker } from './IconPicker'
import {
  useProviders,
  useProviderById,
  useUpdateProviderConfig,
  useCustomProviderMutations,
} from '@/hooks/models/useModels'
import type { ProviderMeta } from '@/lib/core/providers/base'
import type { ConfigSchema, SchemaField } from '@/lib/core/config/types'
import { cn } from '@/lib/ui/utils'
import { toast } from '@/lib/core/utils/toast'
import { providerId as generateProviderId } from '@/lib/core/utils/random'

interface ProviderSelectModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProviderId: string
  onSelect: (providerId: string) => void
  /** 默认创建的 provider 类型 */
  defaultCreateType?: 'openai' | 'anthropic'
}

interface EditingProvider extends Omit<ProviderMeta, 'isCustom'> {
  isNew?: boolean
}

function createDefaultProvider(type: 'openai' | 'anthropic' = 'openai'): EditingProvider {
  return {
    id: generateProviderId(),
    name: '',
    avatar: type === 'anthropic' ? 'anthropic' : 'openai',
    type,
    isNew: true,
  }
}

// 添加 Provider 下拉菜单
function AddProviderMenu({
  onAddNew,
  disabled,
}: {
  onAddNew: (type: 'openai' | 'anthropic') => void
  disabled: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <div className="border-t border-border/20 p-2 relative" ref={menuRef}>
      <button
        onClick={() => !disabled && setShowMenu(!showMenu)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer text-xs text-muted-foreground hover:bg-accent/50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Plus className="w-3 h-3" />
        Add Custom Provider
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-2 mb-1 w-44 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50">
          <button
            onClick={() => {
              onAddNew('openai')
              setShowMenu(false)
            }}
            className="w-full px-3 py-2 text-xs text-left hover:bg-accent cursor-pointer"
          >
            OpenAI Compatible
          </button>
          <button
            onClick={() => {
              onAddNew('anthropic')
              setShowMenu(false)
            }}
            className="w-full px-3 py-2 text-xs text-left hover:bg-accent cursor-pointer"
          >
            Anthropic Compatible
          </button>
        </div>
      )}
    </div>
  )
}

// 配置字段组件
function ConfigField({
  fieldKey,
  field,
  value,
  helpUrl,
  onChange,
  onBlur,
}: {
  fieldKey: string
  field: SchemaField
  value: string
  helpUrl?: string
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = fieldKey.toLowerCase().includes('key')
  const isEnumField = field.enum && field.enum.length > 0

  const handleOpenHelpUrl = useCallback(async () => {
    if (!helpUrl) return
    try {
      await openUrl(helpUrl)
    } catch (error) {
      console.error('Failed to open help URL:', error)
    }
  }, [helpUrl])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {field.label || fieldKey}
        </label>
        {fieldKey === 'apiKey' && helpUrl && (
          <button
            type="button"
            onClick={handleOpenHelpUrl}
            className="text-[10px] text-blue-500 hover:underline cursor-pointer"
          >
            Get API Key
          </button>
        )}
      </div>
      {isEnumField ? (
        <MacOSSelect
          value={value || (field.default as string) || ''}
          onValueChange={(newValue) => {
            onChange(newValue)
            setTimeout(onBlur, 0)
          }}
        >
          <MacOSSelectTrigger className="h-8 text-sm">
            <MacOSSelectValue />
          </MacOSSelectTrigger>
          <MacOSSelectContent>
            {field.enum!.map((option) => (
              <MacOSSelectItem key={option} value={option}>
                {option}
              </MacOSSelectItem>
            ))}
          </MacOSSelectContent>
        </MacOSSelect>
      ) : (
        <div className="flex items-center gap-1">
          <MacOSInput
            type={isPasswordField && !showPassword ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className="h-8 text-sm flex-1"
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
      {field.description && (
        <p className="text-[10px] text-muted-foreground">{field.description}</p>
      )}
    </div>
  )
}

// Builtin Provider 配置面板
function BuiltinProviderConfigPanel({
  providerId,
  onSelect,
}: {
  providerId: string
  onSelect: () => void
}) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const configRef = useRef<Record<string, unknown> | null>(null)

  const { data: provider } = useProviderById(providerId)
  const updateConfig = useUpdateProviderConfig(providerId)

  useEffect(() => {
    if (provider) {
      setConfig(provider.config)
      configRef.current = provider.config
    }
  }, [provider])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setConfig((prev) => {
      const newConfig = prev ? { ...prev, [key]: value } : { [key]: value }
      configRef.current = newConfig
      return newConfig
    })
  }, [])

  const handleBlur = useCallback(() => {
    if (!configRef.current) return
    updateConfig.mutate(configRef.current, {
      onError: (error) =>
        toast.error(`Failed to save: ${error instanceof Error ? error.message : String(error)}`),
    })
  }, [updateConfig])

  if (!provider || !config) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    )
  }

  const schema: ConfigSchema = provider.configSchema
  const schemaEntries = Object.entries(schema)

  return (
    <div className="flex-1 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
          <ProviderIcon provider={provider.avatar} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold">{provider.name}</h3>
          <p className="text-xs text-muted-foreground">{provider.baseUrl}</p>
        </div>
      </div>

      {/* Config Fields */}
      {schemaEntries.length > 0 ? (
        <div className="space-y-4">
          {schemaEntries.map(([key, field]) => (
            <ConfigField
              key={key}
              fieldKey={key}
              field={field}
              value={String(config[key] ?? '')}
              helpUrl={key === 'apiKey' ? provider.helpUrl : undefined}
              onChange={(value) => handleFieldChange(key, value)}
              onBlur={handleBlur}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No configuration required</div>
      )}

      {/* Select Button */}
      <div className="mt-6 pt-4 border-t border-border/10">
        <MacOSButton variant="default" size="sm" onClick={onSelect} className="w-full">
          <Check className="w-4 h-4 mr-1.5" />
          Use this Provider
        </MacOSButton>
      </div>
    </div>
  )
}

// Custom Provider 配置面板
function CustomProviderConfigPanel({
  provider,
  providerId,
  onChange,
  onSaveAndSelect,
  onDelete,
  saving,
}: {
  provider: EditingProvider
  providerId?: string
  onChange: (updates: Partial<EditingProvider>) => void
  onSaveAndSelect: () => void
  onDelete?: () => void
  saving: boolean
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const configRef = useRef<Record<string, unknown>>({})

  const isNew = provider.isNew
  const isValid = provider.name.trim() !== ''

  // 获取已保存的 provider 配置
  const { data: savedProvider } = useProviderById(providerId || '')
  const updateConfig = useUpdateProviderConfig(providerId || '')

  // 加载已保存的配置
  useEffect(() => {
    if (savedProvider && !isNew) {
      setConfig(savedProvider.config || {})
      configRef.current = savedProvider.config || {}
    }
  }, [savedProvider, isNew])

  // 配置项的 schema
  const configSchema: ConfigSchema =
    provider.type === 'anthropic'
      ? {
          baseUrl: {
            type: 'string',
            label: 'Base URL',
            placeholder: 'https://api.anthropic.com',
            description: 'Anthropic compatible API base URL',
            required: true,
          },
          apiKey: {
            type: 'string',
            label: 'API Key',
            placeholder: 'sk-ant-...',
            description: 'Anthropic compatible API key',
            required: true,
          },
        }
      : {
          baseUrl: {
            type: 'string',
            label: 'Base URL',
            placeholder: 'https://api.example.com/v1',
            description: 'OpenAI compatible API base URL',
            required: true,
          },
          apiKey: {
            type: 'string',
            label: 'API Key',
            placeholder: 'sk-...',
            description: 'OpenAI compatible API key',
            required: true,
          },
        }

  const handleConfigChange = useCallback((key: string, value: string) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value }
      configRef.current = newConfig
      return newConfig
    })
  }, [])

  const handleConfigBlur = useCallback(() => {
    if (!providerId || isNew) return
    updateConfig.mutate(configRef.current, {
      onError: (error) =>
        toast.error(`Failed to save: ${error instanceof Error ? error.message : String(error)}`),
    })
  }, [updateConfig, providerId, isNew])

  // 计算 baseUrl 用于显示
  const displayBaseUrl =
    (config.baseUrl as string) ||
    (provider.type === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')

  // Type label
  const typeLabel = provider.type === 'anthropic' ? 'Anthropic Compatible' : 'OpenAI Compatible'

  return (
    <div className="flex-1 p-4 overflow-auto">
      {/* Header - 和 builtin 样式一致 */}
      <div className="flex items-start gap-3 mb-4">
        <IconPicker value={provider.avatar} onChange={(avatar) => onChange({ avatar })} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{provider.name || 'New Provider'}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-accent/50 text-muted-foreground">
              {typeLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{displayBaseUrl}</p>
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Display Name
        </label>
        <MacOSInput
          value={provider.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="My Provider"
          className="h-8 text-sm"
          autoFocus={isNew}
        />
      </div>

      {/* Config Fields - 和 builtin 样式一样 */}
      <div className="space-y-4">
        {Object.entries(configSchema).map(([key, field]) => (
          <ConfigField
            key={key}
            fieldKey={key}
            field={field}
            value={String(config[key] ?? '')}
            onChange={(value) => handleConfigChange(key, value)}
            onBlur={handleConfigBlur}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/10">
        {onDelete && (
          <MacOSButton
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </MacOSButton>
        )}
        <div className="flex-1" />
        <MacOSButton
          variant="default"
          size="sm"
          onClick={onSaveAndSelect}
          disabled={!isValid || saving}
        >
          <Check className="w-4 h-4 mr-1.5" />
          {saving ? 'Saving...' : 'Use this Provider'}
        </MacOSButton>
      </div>
    </div>
  )
}

export function ProviderSelectModal({
  isOpen,
  onClose,
  selectedProviderId,
  onSelect,
  defaultCreateType,
}: ProviderSelectModalProps) {
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null)

  const { data: providers = [], isLoading: loading } = useProviders()
  const { createProvider, updateProvider, deleteProvider } = useCustomProviderMutations()

  const saving = createProvider.isPending || updateProvider.isPending

  // 所有 providers 统一显示
  const allProviders = providers

  // 当前查看的 provider
  const viewingProvider = providers.find((p) => p.id === viewingId)

  useEffect(() => {
    if (isOpen) {
      if (defaultCreateType) {
        setViewingId('__new__')
        setEditingProvider(createDefaultProvider(defaultCreateType))
      } else {
        setViewingId(selectedProviderId)
        setEditingProvider(null)
      }
    } else {
      setViewingId(null)
      setEditingProvider(null)
    }
  }, [isOpen, defaultCreateType, selectedProviderId])

  const handleSelectProvider = (provider: ProviderMeta) => {
    setViewingId(provider.id)
    if (provider.isCustom) {
      setEditingProvider({
        id: provider.id,
        name: provider.name,
        avatar: provider.avatar,
        type: provider.type,
        isNew: false,
      })
    } else {
      setEditingProvider(null)
    }
  }

  const handleAddNew = (type: 'openai' | 'anthropic' = 'openai') => {
    setViewingId('__new__')
    setEditingProvider(createDefaultProvider(type))
  }

  const handleSaveAndSelect = () => {
    if (!editingProvider) return
    if (!editingProvider.id || !editingProvider.name) return

    const providerId = editingProvider.id

    const onSuccess = () => {
      // 保存成功后选中并关闭
      onSelect(providerId)
      onClose()
    }
    const onError = (error: Error) => {
      console.error('Failed to save provider:', error)
      toast.error(`Failed to save: ${error.message}`)
    }

    if (editingProvider.isNew) {
      const config: ProviderMeta = {
        id: editingProvider.id,
        name: editingProvider.name,
        avatar: editingProvider.avatar,
        type: editingProvider.type,
      }
      createProvider.mutate(config, { onSuccess, onError })
    } else {
      updateProvider.mutate(
        {
          id: editingProvider.id,
          updates: {
            name: editingProvider.name,
            avatar: editingProvider.avatar,
            type: editingProvider.type,
          },
        },
        { onSuccess, onError },
      )
    }
  }

  const handleDelete = () => {
    if (!viewingId || viewingId === '__new__') return

    deleteProvider.mutate(viewingId, {
      onSuccess: () => {
        setViewingId(selectedProviderId)
        setEditingProvider(null)
      },
      onError: (error) => {
        console.error('Failed to delete provider:', error)
        toast.error(`Failed to delete: ${error.message}`)
      },
    })
  }

  const handleChange = (updates: Partial<EditingProvider>) => {
    if (editingProvider) {
      setEditingProvider({ ...editingProvider, ...updates })
    }
  }

  const handleUseProvider = () => {
    if (viewingId && viewingId !== '__new__') {
      onSelect(viewingId)
      onClose()
    }
  }

  // 渲染右侧面板
  const renderConfigPanel = () => {
    if (viewingId === '__new__' && editingProvider) {
      return (
        <CustomProviderConfigPanel
          provider={editingProvider}
          onChange={handleChange}
          onSaveAndSelect={handleSaveAndSelect}
          saving={saving}
        />
      )
    }

    if (viewingProvider) {
      if (viewingProvider.isCustom && editingProvider) {
        return (
          <CustomProviderConfigPanel
            provider={editingProvider}
            providerId={viewingProvider.id}
            onChange={handleChange}
            onSaveAndSelect={handleSaveAndSelect}
            onDelete={handleDelete}
            saving={saving}
          />
        )
      } else {
        return (
          <BuiltinProviderConfigPanel
            providerId={viewingProvider.id}
            onSelect={handleUseProvider}
          />
        )
      }
    }

    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select a provider
      </div>
    )
  }

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="640px" height="480px">
      <MacOSSheetContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">Select Provider</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {providers.length} providers available
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Provider List (Left) */}
          <div className="w-[200px] border-r border-border/20 flex flex-col">
            <MacOSScrollArea className="flex-1 [&>div>div]:!block">
              <div className="py-1">
                {loading ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : (
                  <>
                    {/* New Provider (when creating) */}
                    {viewingId === '__new__' && (
                      <div
                        className={cn('px-2 py-1.5 cursor-pointer overflow-hidden', 'bg-accent')}
                      >
                        <div className="px-2 flex items-center gap-2 min-w-0">
                          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs font-medium">New Provider</span>
                        </div>
                      </div>
                    )}
                    {/* All Providers */}
                    {allProviders.map((provider) => (
                      <div
                        key={provider.id}
                        className={cn(
                          'px-2 py-1.5 cursor-pointer overflow-hidden',
                          'hover:bg-accent/50',
                          viewingId === provider.id && 'bg-accent',
                        )}
                        onClick={() => handleSelectProvider(provider)}
                      >
                        <div className="px-2 flex items-center gap-2 min-w-0">
                          <ProviderIcon provider={provider.avatar} size={14} />
                          <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap flex-1">
                            {provider.name}
                          </span>
                          {selectedProviderId === provider.id && (
                            <Check className="w-3 h-3 text-foreground flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                    {allProviders.length === 0 && viewingId !== '__new__' && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No providers configured
                      </div>
                    )}
                  </>
                )}
              </div>
            </MacOSScrollArea>

            {/* Add Button */}
            <AddProviderMenu
              onAddNew={handleAddNew}
              disabled={viewingId === '__new__'}
            />
          </div>

          {/* Config Panel (Right) */}
          {renderConfigPanel()}
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}
