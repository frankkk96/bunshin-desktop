import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw } from 'lucide-react'
import {
  MacOSSheet,
  MacOSSheetContent,
  MacOSInput,
  MacOSButton,
} from '@/components/ui'
import { SettingModal } from '@/components/features/Settings/components/SettingModal'
import { ProviderIcon } from '@/components/common/Icons/ProviderIcon'
import { ProviderSelectModal } from '@/components/features/Agents/Custom/components/BasicSettings/ProviderSelectModal'
import { ModelSelectModal } from '@/components/features/Agents/Custom/components/BasicSettings/ModelSelectModal'
import { useProviders, useModelsByProvider } from '@/hooks/models/useModels'
import { generateUniqueAgentName, validateAgentName } from '@/lib/ui/validation/forms'
import { cn } from '@/lib/ui/utils'

export interface AgentCreationData {
  name: string
  providerId: string
  modelId: string
  providerName: string
  modelName: string
}

interface AgentCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: AgentCreationData) => void
  isCreating?: boolean
}

export function AgentCreationModal({
  isOpen,
  onClose,
  onConfirm,
  isCreating = false,
}: AgentCreationModalProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | undefined>()
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [isProviderSelectOpen, setIsProviderSelectOpen] = useState(false)
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false)

  const { data: providers = [] } = useProviders()
  const { data: models = [] } = useModelsByProvider(selectedProviderId)

  // 获取当前选中的 provider 和 model
  const currentProvider = providers.find((p) => p.id === selectedProviderId)
  const currentModel = models.find((m) => m.id === selectedModelId)

  // 初始化默认值
  useEffect(() => {
    if (isOpen) {
      // 生成随机名称
      setName(generateUniqueAgentName())
      setNameError(undefined)

      // 默认选择第一个 provider（优先 openai）
      const preferredProvider = providers.find((p) => p.id === 'openai') ?? providers[0]
      if (preferredProvider) {
        setSelectedProviderId(preferredProvider.id)
      }
    }
  }, [isOpen, providers])

  // 当 provider 改变时，自动选择第一个 model
  useEffect(() => {
    if (models.length > 0 && selectedProviderId) {
      setSelectedModelId(models[0].id)
    } else {
      setSelectedModelId('')
    }
  }, [models, selectedProviderId])

  // 重新生成名称
  const handleRegenerateName = useCallback(() => {
    setName(generateUniqueAgentName())
    setNameError(undefined)
  }, [])

  // 验证名称
  const handleNameChange = useCallback((value: string) => {
    setName(value)
    if (value) {
      const validation = validateAgentName(value)
      setNameError(validation.error)
    } else {
      setNameError(undefined)
    }
  }, [])

  // 提交创建
  const handleConfirm = useCallback(() => {
    const validation = validateAgentName(name)
    if (!validation.valid) {
      setNameError(validation.error)
      return
    }

    if (!selectedProviderId || !selectedModelId || !currentProvider || !currentModel) {
      return
    }

    onConfirm({
      name,
      providerId: selectedProviderId,
      modelId: selectedModelId,
      providerName: currentProvider.name,
      modelName: currentModel.name || currentModel.id,
    })
  }, [name, selectedProviderId, selectedModelId, currentProvider, currentModel, onConfirm])

  // 判断是否可以提交
  const canSubmit = name.trim() !== '' && !nameError && selectedProviderId && selectedModelId

  return (
    <>
      <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="400px" height="auto">
        <MacOSSheetContent className="p-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <h2 className="text-base font-semibold">New Agent</h2>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4 space-y-4">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <div className="flex items-center gap-2">
                <MacOSInput
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter agent name"
                  className={cn('h-8 text-sm flex-1', nameError && 'border-destructive')}
                  autoFocus
                />
                <button
                  onClick={handleRegenerateName}
                  className="p-1.5 rounded hover:bg-accent cursor-pointer"
                  title="Generate random name"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {nameError && <p className="text-[10px] text-destructive">{nameError}</p>}
            </div>

            {/* Provider Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Provider
              </label>
              <SettingModal
                label={currentProvider?.name || 'Select provider...'}
                icon={
                  currentProvider ? (
                    <ProviderIcon provider={currentProvider.avatar} size={16} />
                  ) : undefined
                }
                onClick={() => setIsProviderSelectOpen(true)}
                className="w-full"
              />
            </div>

            {/* Model Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Model
              </label>
              <SettingModal
                label={currentModel?.name || currentModel?.id || 'Select model...'}
                onClick={() => setIsModelSelectOpen(true)}
                disabled={!selectedProviderId || models.length === 0}
                className="w-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/20">
            <MacOSButton variant="ghost" size="sm" onClick={onClose} disabled={isCreating}>
              Cancel
            </MacOSButton>
            <MacOSButton
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={!canSubmit || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </MacOSButton>
          </div>
        </MacOSSheetContent>
      </MacOSSheet>

      {/* Provider Select Modal */}
      <ProviderSelectModal
        isOpen={isProviderSelectOpen}
        onClose={() => setIsProviderSelectOpen(false)}
        selectedProviderId={selectedProviderId}
        onSelect={(id) => {
          setSelectedProviderId(id)
          setIsProviderSelectOpen(false)
        }}
      />

      {/* Model Select Modal */}
      <ModelSelectModal
        models={models}
        selectedModelId={selectedModelId}
        isOpen={isModelSelectOpen}
        onClose={() => setIsModelSelectOpen(false)}
        onSelect={(id) => {
          setSelectedModelId(id)
          setIsModelSelectOpen(false)
        }}
        providerId={selectedProviderId}
        isCustomProvider={currentProvider?.isCustom ?? false}
      />
    </>
  )
}
