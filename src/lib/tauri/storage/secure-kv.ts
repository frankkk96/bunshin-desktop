import { invoke } from '@tauri-apps/api/core'

export interface SecureStorageOptions {
  service?: string
}

/**
 * Secure KV Store - 安全密钥存储适配层
 *
 * 使用操作系统提供的安全存储：
 * - macOS: Keychain
 * - Windows: Windows Credential Manager
 * - Linux: Secret Service (libsecret)
 */
export class SecureKVStore {
  private service: string

  constructor(options: SecureStorageOptions = {}) {
    this.service = options.service || 'bunshin-app'
  }

  /**
   * 存储密钥
   */
  async setSecret(key: string, value: string): Promise<void> {
    await invoke('secure_store_set', {
      service: this.service,
      key,
      value,
    })
  }

  /**
   * 获取密钥
   */
  async getSecret(key: string): Promise<string | null> {
    return invoke<string | null>('secure_store_get', {
      service: this.service,
      key,
    })
  }

  /**
   * 删除密钥
   */
  async deleteSecret(key: string): Promise<void> {
    await invoke('secure_store_delete', {
      service: this.service,
      key,
    })
  }

  /**
   * 列出所有密钥名称
   */
  async listKeys(): Promise<string[]> {
    return invoke<string[]>('secure_store_list', {
      service: this.service,
    })
  }

  /**
   * 检查密钥是否存在
   */
  async hasSecret(key: string): Promise<boolean> {
    const value = await this.getSecret(key)
    return value !== null
  }
}

// 预定义的存储实例
export const apiKeyStore = new SecureKVStore({ service: 'bunshin-api-keys' })
export const secureStore = new SecureKVStore({ service: 'bunshin-secure' })
