import { useState, useCallback } from 'react'
import type { Agent } from '@/lib/core/agent/types'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingModal } from '@/components/features/Settings/components/SettingModal'
import { Settings, Cloud, Cpu, RefreshCw, AlertCircle } from 'lucide-react'
import { CREATE_MODEL_ID } from '@/lib/core/providers/base'
import { ProviderIcon } from '@/components/common'
import { ModelSelectModal } from './ModelSelectModal'
import { ProviderSelectModal } from './ProviderSelectModal'
import { useModelProviderSection } from './useModelProviderSection'
import { SettingDivider } from '@/components/features/Settings/components/SettingDivider'

// 刷新按钮组件
function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={loading}
      className="p-0.5 rounded hover:bg-accent/50 cursor-pointer disabled:opacity-50"
      title="Refresh models"
    >
      <RefreshCw
        className={`w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground ${
          loading ? 'animate-spin' : ''
        }`}
      />
    </button>
  )
}

interface ModelProviderSectionProps {
  agent: Agent
  onUpdate: (updates: Partial<Agent>) => void
}

export function ModelProviderSection({ agent, onUpdate }: ModelProviderSectionProps) {
  const [isProviderSelectOpen, setIsProviderSelectOpen] = useState(false)
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false)
  const [createProviderType, setCreateProviderType] = useState<'openai' | 'anthropic' | undefined>()

  const {
    currentProvider,
    candidateModels,
    customConfigSchema,
    currentCustomConfig,
    handleProviderChange,
    handleModelChange,
    handleCustomConfigChange,
    reloadModels,
  } = useModelProviderSection({ agent, onUpdate })

  // 当前选中的模型
  const currentModel = candidateModels.find((m) => m.id === agent.llm.modelId)

  // 判断当前 provider 是否是自定义的
  const isCustomProvider = currentProvider?.isCustom ?? false

  // 关闭 ProviderSelectModal 时重置 createProviderType
  const handleProviderSelectClose = useCallback(() => {
    setIsProviderSelectOpen(false)
    setCreateProviderType(undefined)
  }, [])

  return (
    <SettingSection title="Model" icon={Settings}>
      <SettingRow
        icon={<Cloud className="w-4 h-4" />}
        title="Provider"
        description={currentProvider?.baseUrl}
      >
        <SettingModal
          label={currentProvider?.name || 'Select...'}
          icon={
            currentProvider ? (
              currentProvider.configured ? (
                <ProviderIcon provider={currentProvider.avatar} size={16} />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )
            ) : undefined
          }
          onClick={() => setIsProviderSelectOpen(true)}
          warning={currentProvider && !currentProvider.configured ? 'Not configured' : undefined}
        />
      </SettingRow>
      <SettingDivider />

      <SettingRow
        icon={<Cpu className="w-4 h-4" />}
        title="Model"
        description={`${candidateModels.filter((m) => m.id !== CREATE_MODEL_ID).length} models`}
        action={
          !isCustomProvider ? (
            <RefreshButton onClick={() => reloadModels.mutate()} loading={reloadModels.isPending} />
          ) : undefined
        }
      >
        <SettingModal
          label={currentModel ? currentModel.name || currentModel.id : 'Select...'}
          onClick={() => setIsModelSelectOpen(true)}
          disabled={candidateModels.length === 0}
        />
      </SettingRow>

      {/* Provider Select Modal */}
      <ProviderSelectModal
        isOpen={isProviderSelectOpen}
        onClose={handleProviderSelectClose}
        selectedProviderId={agent.llm.providerId}
        onSelect={handleProviderChange}
        defaultCreateType={createProviderType}
      />

      {/* Model Select Modal */}
      <ModelSelectModal
        models={candidateModels}
        selectedModelId={agent.llm.modelId}
        isOpen={isModelSelectOpen}
        onClose={() => setIsModelSelectOpen(false)}
        onSelect={handleModelChange}
        providerId={agent.llm.providerId}
        isCustomProvider={isCustomProvider}
        customConfigSchema={customConfigSchema}
        customConfig={currentCustomConfig}
        onCustomConfigChange={handleCustomConfigChange}
        onModelsChanged={() => reloadModels.mutate()}
      />
    </SettingSection>
  )
}
