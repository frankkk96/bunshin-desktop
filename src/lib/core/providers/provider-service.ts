import { logger } from '@/lib/core/utils/logger'
import { Provider, ProviderMeta } from '@/lib/core/providers/base'
import {
  // Core providers
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  AmazonBedrockProvider,
  AzureFoundryProvider,
  // OpenAI-compatible providers
  DeepSeekProvider,
  GroqProvider,
  XAIProvider,
  MistralProvider,
  PerplexityProvider,
  // Chinese providers
  AlibabaProvider,
  ZhipuAIProvider,
  MoonshotAIProvider,
  OpenRouterProvider,
  OllamaProvider,
} from './builtin'
import { SecureKVStore } from '@/lib/tauri/storage/secure-kv'
import { CustomAnthropicProvider } from './custom/custom-anthropic-provider'
import { CustomOpenAIProvider } from './custom/custom-openai-provider'

// Built-in provider classes
const BUILTIN_PROVIDERS = [
  // Core providers
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  AmazonBedrockProvider,
  AzureFoundryProvider,
  // OpenAI-compatible providers
  DeepSeekProvider,
  GroqProvider,
  XAIProvider,
  MistralProvider,
  PerplexityProvider,
  // Chinese providers
  AlibabaProvider,
  ZhipuAIProvider,
  MoonshotAIProvider,
  OpenRouterProvider,
  OllamaProvider,
] as const

const CUSTOM_PROVIDERS_KEY = 'custom-providers'

class ProviderService {
  private providers = new Map<string, Provider>()
  private configStore: SecureKVStore
  public readonly ready: Promise<void>

  constructor() {
    this.configStore = new SecureKVStore({ service: 'bunshin-config' })
    this.ready = this.initialize().catch((error) => {
      logger.error('Failed to initialize ProviderService', error)
      throw error
    })
  }

  /**
   * Initialize the service - create and initialize all built-in and custom providers (并行)
   */
  private async initialize(): Promise<void> {
    try {
      // 并行初始化所有 built-in providers
      const builtinPromises = BUILTIN_PROVIDERS.map((ProviderClass) =>
        this.initializeBuiltinProvider(ProviderClass),
      )

      // 加载并初始化所有 custom providers
      const customProviders = await this.createCustomProviderInstances()
      const customPromises = customProviders.map((provider) => this.registerProvider(provider))

      await Promise.all([...builtinPromises, ...customPromises])
      logger.debug('All providers initialized')
    } catch (error) {
      logger.error('Failed to initialize providers', error)
      throw error
    }
  }

  /**
   * Initialize a built-in provider
   */
  private async initializeBuiltinProvider(
    ProviderClass: (typeof BUILTIN_PROVIDERS)[number],
  ): Promise<void> {
    const provider = new ProviderClass()
    await this.registerProvider(provider)
  }

  /**
   * Register a provider instance
   */
  private async registerProvider(provider: Provider): Promise<void> {
    // Register the provider by ID
    this.providers.set(provider.id, provider)

    try {
      // Wait for provider initialization (loads config and models)
      await provider.ready
      logger.debug('Provider initialized', { providerId: provider.id })
    } catch (error) {
      logger.error('Provider initialization failed', { providerId: provider.id, error })
    }
  }

  /** Get all provider instances (sorted alphabetically by name) */
  public getProviders(): Provider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /** Get provider by ID */
  public getProviderById(id: string): Provider {
    const provider = this.providers.get(id)
    if (!provider) throw new Error(`Provider '${id}' not found`)
    return provider
  }

  /** Update provider configuration */
  public async updateProviderConfig(
    providerId: string,
    config: Record<string, unknown>,
  ): Promise<void> {
    await this.ready

    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`)
    }

    // Provider handles config save
    await provider.updateConfig(config)
  }

  /** Get all available providers */
  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).sort()
  }

  /** Check if a provider is custom */
  public isCustomProvider(providerId: string): boolean {
    const provider = this.providers.get(providerId)
    return provider?.isCustom ?? false
  }

  /** Reload models for a specific provider */
  public async reloadProviderModels(providerId: string): Promise<void> {
    await this.ready

    const provider = this.providers.get(providerId)
    if (!provider) {
      logger.warn(`Provider '${providerId}' not found for model reload`)
      return
    }

    await provider.reloadModels()
    logger.debug('Provider models reloaded', { providerId })
  }

  // ============ Custom Provider Management ============

  /** Get all custom provider configurations */
  public async getCustomProviders(): Promise<ProviderMeta[]> {
    try {
      const data = await this.configStore.getSecret(CUSTOM_PROVIDERS_KEY)
      if (!data) return []
      return JSON.parse(data) as ProviderMeta[]
    } catch (error) {
      logger.error('Failed to load custom providers', error)
      return []
    }
  }

  /** Create Provider instances for all custom providers */
  private async createCustomProviderInstances(): Promise<Provider[]> {
    const configs = await this.getCustomProviders()
    const providers: Provider[] = []

    for (const config of configs) {
      try {
        const provider =
          config.type === 'anthropic'
            ? new CustomAnthropicProvider(config)
            : new CustomOpenAIProvider(config)

        providers.push(provider)
      } catch (error) {
        logger.error(`Failed to create custom provider: ${config.id}`, error)
      }
    }

    return providers
  }

  /** Save custom providers to storage */
  private async saveCustomProviders(providers: ProviderMeta[]): Promise<void> {
    await this.configStore.setSecret(CUSTOM_PROVIDERS_KEY, JSON.stringify(providers))
  }

  /** Create a new custom provider */
  public async createCustomProvider(config: ProviderMeta): Promise<void> {
    await this.ready

    const providers = await this.getCustomProviders()

    // Check for duplicate id
    if (providers.some((p) => p.id === config.id)) {
      throw new Error(`Provider with id "${config.id}" already exists`)
    }

    const stored: ProviderMeta = {
      id: config.id,
      name: config.name,
      avatar: config.avatar,
      type: config.type,
      isCustom: true,
    }

    providers.push(stored)
    await this.saveCustomProviders(providers)

    // Create and register the provider instance
    const newProvider =
      stored.type === 'anthropic'
        ? new CustomAnthropicProvider(stored)
        : new CustomOpenAIProvider(stored)

    await this.registerProvider(newProvider)
  }

  /** Update a custom provider */
  public async updateCustomProvider(
    id: string,
    updates: Partial<Omit<ProviderMeta, 'id'>>,
  ): Promise<void> {
    await this.ready

    const providers = await this.getCustomProviders()
    const index = providers.findIndex((p) => p.id === id)

    if (index === -1) {
      throw new Error(`Provider "${id}" not found`)
    }

    const updated: ProviderMeta = {
      ...providers[index],
      ...(updates.name && { name: updates.name }),
      ...(updates.avatar && { avatar: updates.avatar }),
      ...(updates.type && { type: updates.type }),
    }

    providers[index] = updated
    await this.saveCustomProviders(providers)

    // Remove the old provider instance
    this.providers.delete(id)

    // Re-create and register the provider instance
    const newProvider =
      updated.type === 'anthropic'
        ? new CustomAnthropicProvider(updated)
        : new CustomOpenAIProvider(updated)

    await this.registerProvider(newProvider)
  }

  /** Delete a custom provider */
  public async deleteCustomProvider(id: string): Promise<void> {
    await this.ready

    const providers = await this.getCustomProviders()
    const filtered = providers.filter((p) => p.id !== id)

    await this.saveCustomProviders(filtered)

    // Remove from providers map
    this.providers.delete(id)
  }
}

// 导出单例
export const providerService = new ProviderService()
