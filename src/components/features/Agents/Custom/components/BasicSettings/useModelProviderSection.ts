import { useCallback, useMemo, useEffect, useRef } from 'react'
import type { Agent, CustomConfig } from '@/lib/core/agent/types'
import { providerService } from '@/lib/core/providers/provider-service'
import { CREATE_MODEL_ID } from '@/lib/core/providers/base'
import {
  useModelsByProvider,
  useProviders,
  useInvalidateModels,
  useReloadModels,
} from '@/hooks/models/useModels'

interface UseModelProviderSectionProps {
  agent: Agent
  onUpdate: (updates: Partial<Agent>) => void
}

export function useModelProviderSection({ agent, onUpdate }: UseModelProviderSectionProps) {
  // 使用 React Query 获取当前 provider 的 models
  const { data: candidateModels = [] } = useModelsByProvider(agent.llm.providerId)
  // 使用 React Query 获取所有 providers
  const { data: providers = [] } = useProviders()
  const { invalidateProviders } = useInvalidateModels()
  const reloadModels = useReloadModels(agent.llm.providerId)

  // 追踪是否刚切换了 provider，需要自动选择第一个 model
  const pendingProviderChange = useRef<string | null>(null)

  // 当 provider 切换后，models 加载完成时自动选择第一个 model
  useEffect(() => {
    if (!pendingProviderChange.current) return
    if (pendingProviderChange.current !== agent.llm.providerId) return

    // 过滤掉 CREATE_MODEL_ID，找到真正的第一个 model
    const realModels = candidateModels.filter((m) => m.id !== CREATE_MODEL_ID)
    if (realModels.length === 0) {
      // 模型还没加载完成，等待下一次 effect
      return
    }

    const nextModelId = realModels[0].id
    if (agent.llm.modelId === nextModelId) {
      pendingProviderChange.current = null
      return
    }

    const provider = providers.find((p) => p.id === agent.llm.providerId)
    onUpdate({
      llm: { ...agent.llm, modelId: nextModelId },
      description: `${provider?.name ?? agent.llm.providerId} | ${nextModelId}`,
    })
    pendingProviderChange.current = null
  }, [agent.llm, candidateModels, providers, onUpdate])

  // 获取当前 provider
  const currentProvider = useMemo(() => {
    return providers.find((p) => p.id === agent.llm.providerId)
  }, [agent.llm.providerId, providers])

  // 获取当前选中的 model
  const currentModel = useMemo(() => {
    return candidateModels.find((m) => m.id === agent.llm.modelId)
  }, [candidateModels, agent.llm.modelId])

  // 获取当前 model 的 configSchema
  const customConfigSchema = useMemo(() => {
    return currentModel?.configSchema
  }, [currentModel])

  // 生成当前 provider+model 的 identifier
  const currentIdentifier = useMemo(() => {
    return `${agent.llm.providerId}:${agent.llm.modelId}`
  }, [agent.llm.providerId, agent.llm.modelId])

  // 获取当前 identifier 对应的 customConfig，如果没有则使用默认值
  const currentCustomConfig = useMemo(() => {
    const existing = agent.llm.customConfigs?.find((c) => c.identifier === currentIdentifier)
    if (existing) return existing

    // 如果没有配置但有 schema，返回带默认值的临时配置（不保存，仅用于显示）
    if (customConfigSchema) {
      const defaultConfigs: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(customConfigSchema)) {
        if (field.default !== undefined) {
          defaultConfigs[key] = field.default
        } else if (field.enum && field.enum.length > 0) {
          defaultConfigs[key] = field.enum[0]
        }
      }
      return { identifier: currentIdentifier, configs: defaultConfigs }
    }
    return undefined
  }, [agent.llm.customConfigs, currentIdentifier, customConfigSchema])

  // 更新 customConfig 的某个字段
  const handleCustomConfigChange = useCallback(
    (key: string, value: unknown) => {
      const existingConfigs = agent.llm.customConfigs || []
      const existingIndex = existingConfigs.findIndex((c) => c.identifier === currentIdentifier)

      let newConfigs: CustomConfig[]
      if (existingIndex >= 0) {
        // 更新已存在的配置
        newConfigs = existingConfigs.map((c, i) =>
          i === existingIndex ? { ...c, configs: { ...c.configs, [key]: value } } : c,
        )
      } else {
        // 创建新配置，使用 currentCustomConfig 的默认值作为基础
        const baseConfigs = currentCustomConfig?.configs || {}
        newConfigs = [
          ...existingConfigs,
          { identifier: currentIdentifier, configs: { ...baseConfigs, [key]: value } },
        ]
      }

      onUpdate({
        llm: {
          ...agent.llm,
          customConfigs: newConfigs,
        },
      })
    },
    [agent.llm, currentIdentifier, currentCustomConfig, onUpdate],
  )

  // 处理 provider 变更
  const handleProviderChange = useCallback(
    (providerId: string) => {
      const newProvider = providers.find((p) => p.id === providerId)
      if (!newProvider) return

      // 标记 provider 切换，等 models 加载完成后自动选择第一个
      pendingProviderChange.current = providerId

      // 先切换 provider，modelId 暂时清空，等 useEffect 自动选择
      onUpdate({
        llm: { ...agent.llm, providerId, modelId: '' },
        description: `${newProvider.name} | ...`,
      })
    },
    [agent.llm, onUpdate, providers],
  )

  // 处理 model 变更
  const handleModelChange = useCallback(
    (modelId: string) => {
      pendingProviderChange.current = null
      const provider = providerService.getProviderById(agent.llm.providerId)
      onUpdate({
        llm: { ...agent.llm, modelId },
        description: `${provider?.name ?? agent.llm.providerId} | ${modelId}`,
      })
    },
    [agent.llm, onUpdate],
  )

  return {
    providers,
    currentProvider,
    currentModel,
    candidateModels,
    customConfigSchema,
    currentCustomConfig,
    handleProviderChange,
    handleModelChange,
    handleCustomConfigChange,
    reloadModels,
    invalidateProviders,
  }
}
