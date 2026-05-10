import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { modelsApi } from '@/lib/tauri/service/models'
import { providerService } from '@/lib/core/providers/provider-service'
import { useCallback } from 'react'
import type { Model } from '@/lib/core/providers/types'
import type { ProviderMeta } from '@/lib/core/providers/base'

// Query keys
export const modelKeys = {
  all: ['models'] as const,
  byProvider: (providerId: string) => ['models', 'provider', providerId] as const,
}

export const providerKeys = {
  all: ['providers'] as const,
  byId: (providerId: string) => ['providers', providerId] as const,
  custom: ['providers', 'custom'] as const,
}

/**
 * Get models by provider with caching
 * 从 providerService 获取，支持 provider 实例的过滤逻辑（如 Bedrock inference profiles）
 */
export function useModelsByProvider(providerId: string) {
  return useQuery({
    queryKey: modelKeys.byProvider(providerId),
    queryFn: async () => {
      await providerService.ready
      const provider = providerService.getProviderById(providerId)
      return provider.models
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!providerId,
  })
}

/**
 * Get all providers with caching
 */
export function useProviders() {
  return useQuery({
    queryKey: providerKeys.all,
    queryFn: async () => {
      await providerService.ready
      return providerService.getProviders()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to invalidate models cache for a provider
 */
export function useInvalidateModels() {
  const queryClient = useQueryClient()

  const invalidateByProvider = useCallback(
    (providerId: string) => {
      queryClient.invalidateQueries({ queryKey: modelKeys.byProvider(providerId) })
    },
    [queryClient],
  )

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: modelKeys.all })
  }, [queryClient])

  const invalidateProviders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: providerKeys.all })
  }, [queryClient])

  return { invalidateByProvider, invalidateAll, invalidateProviders }
}

/**
 * Mutation hooks for model CRUD operations
 */
export function useModelMutations(providerId: string) {
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: modelKeys.byProvider(providerId) })
  }, [queryClient, providerId])

  const createModel = useMutation({
    mutationFn: (model: Model) => modelsApi.createModel(model, providerId),
    onSuccess: invalidate,
  })

  const updateModel = useMutation({
    mutationFn: (model: Model) => modelsApi.updateModel(model, providerId),
    onSuccess: invalidate,
  })

  const deleteModel = useMutation({
    mutationFn: (modelId: string) => modelsApi.deleteModel(modelId, providerId),
    onSuccess: invalidate,
  })

  return { createModel, updateModel, deleteModel }
}

/**
 * Mutation hook for reloading models (e.g., after provider config change)
 */
export function useReloadModels(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => providerService.reloadProviderModels(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelKeys.byProvider(providerId) })
    },
  })
}

/**
 * Get a single provider by ID
 */
export function useProviderById(providerId: string) {
  return useQuery({
    queryKey: providerKeys.byId(providerId),
    queryFn: async () => {
      await providerService.ready
      return providerService.getProviderById(providerId)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!providerId,
  })
}

/**
 * Get custom providers list
 */
export function useCustomProviders() {
  return useQuery({
    queryKey: providerKeys.custom,
    queryFn: () => providerService.getCustomProviders(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Mutation hooks for custom provider CRUD operations
 */
export function useCustomProviderMutations() {
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: providerKeys.all })
    queryClient.invalidateQueries({ queryKey: providerKeys.custom })
  }, [queryClient])

  const createProvider = useMutation({
    mutationFn: (config: ProviderMeta) => providerService.createCustomProvider(config),
    onSuccess: invalidate,
  })

  const updateProvider = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<ProviderMeta, 'id'>> }) =>
      providerService.updateCustomProvider(id, updates),
    onSuccess: invalidate,
  })

  const deleteProvider = useMutation({
    mutationFn: (id: string) => providerService.deleteCustomProvider(id),
    onSuccess: invalidate,
  })

  return { createProvider, updateProvider, deleteProvider }
}

/**
 * Mutation hook for updating provider config
 */
export function useUpdateProviderConfig(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      providerService.updateProviderConfig(providerId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.byId(providerId) })
      queryClient.invalidateQueries({ queryKey: modelKeys.byProvider(providerId) })
    },
  })
}
