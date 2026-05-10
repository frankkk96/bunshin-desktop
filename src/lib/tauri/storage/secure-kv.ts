import { invoke } from '@tauri-apps/api/core'

/**
 * Thin wrapper around the age-encrypted secure_storage backend.
 * Used today for Supabase auth tokens and provider API keys.
 */
export class SecureKVStore {
  private readonly service: string

  constructor({ service }: { service: string }) {
    this.service = service
  }

  async setSecret(key: string, value: string): Promise<void> {
    await invoke('secure_store_set', { service: this.service, key, value })
  }

  async getSecret(key: string): Promise<string | null> {
    const result = await invoke<string | null>('secure_store_get', {
      service: this.service,
      key,
    })
    return result ?? null
  }

  async deleteSecret(key: string): Promise<void> {
    await invoke('secure_store_delete', { service: this.service, key })
  }
}
