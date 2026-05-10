import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { providersApi } from '@/lib/tauri/service/providers'
import type { Provider, ProviderType } from '@/lib/types'

const KEY = ['providers'] as const

export function useProviders() {
  return useQuery({ queryKey: KEY, queryFn: providersApi.list })
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => providersApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string
      type: ProviderType
      baseUrl: string | null
      apiKey?: string
    }) =>
      providersApi
        .create({ name: input.name, type: input.type, baseUrl: input.baseUrl })
        .then(async (p) => {
          if (input.type === 'api' && input.apiKey) {
            await providersApi.setApiKey(p.id, input.apiKey)
          }
          return p
        }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      name: string
      baseUrl: string | null
      apiKey?: string
    }) =>
      providersApi
        .update({ id: input.id, name: input.name, baseUrl: input.baseUrl })
        .then(async (p) => {
          if (input.apiKey !== undefined) {
            await providersApi.setApiKey(p.id, input.apiKey)
          }
          return p
        }),
    onSuccess: (data: Provider) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, data.id] })
    },
  })
}

export function useDeleteProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => providersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useHasApiKey(providerId: string | undefined) {
  return useQuery({
    queryKey: ['providers', providerId, 'has-key'],
    queryFn: () => providersApi.hasApiKey(providerId!),
    enabled: !!providerId,
  })
}
