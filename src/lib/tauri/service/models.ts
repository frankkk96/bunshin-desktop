import { invoke } from '@tauri-apps/api/core'
import type { Model } from '@/lib/core/providers/types'

/**
 * Model management (database-backed with remote fallback)
 */
export const modelsApi = {
  /**
   * Get models by provider
   * 优先从本地 JSON 配置读取，如果没有则从远程 API 获取
   */
  getModelsByProvider: async (providerId: string): Promise<Model[]> => {
    return invoke<Model[]>('get_models_by_provider', { providerId })
  },

  /**
   * Get model by id and provider
   */
  getModelById: async (modelId: string, providerId: string): Promise<Model | null> => {
    return invoke<Model | null>('get_model_by_id', { modelId, providerId })
  },

  /**
   * Create a new model
   */
  createModel: async (model: Model, providerId: string): Promise<Model> => {
    return invoke<Model>('create_model', { model, providerId })
  },

  /**
   * Update an existing model (marks as user_modified)
   */
  updateModel: async (model: Model, providerId: string): Promise<Model> => {
    return invoke<Model>('update_model', { model, providerId })
  },

  /**
   * Delete a model
   */
  deleteModel: async (modelId: string, providerId: string): Promise<void> => {
    return invoke<void>('delete_model', { modelId, providerId })
  },
}
