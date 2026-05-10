import { invoke } from '@tauri-apps/api/core'
import type { Provider, ProviderType } from '@/lib/types'

export const providersApi = {
  list: () => invoke<Provider[]>('list_providers'),
  get: (id: string) => invoke<Provider | null>('get_provider', { id }),
  create: (input: { name: string; type: ProviderType; baseUrl: string | null }) =>
    invoke<Provider>('create_provider', { input }),
  update: (input: { id: string; name: string; baseUrl: string | null }) =>
    invoke<Provider>('update_provider', { input }),
  delete: (id: string) => invoke<void>('delete_provider', { id }),
  setApiKey: (providerId: string, apiKey: string) =>
    invoke<void>('set_provider_api_key', { providerId, apiKey }),
  hasApiKey: (providerId: string) =>
    invoke<boolean>('has_provider_api_key', { providerId }),
}
