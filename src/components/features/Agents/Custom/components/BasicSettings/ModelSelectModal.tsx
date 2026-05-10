import { useState, useEffect } from 'react'
import {
  X,
  Check,
  XIcon,
  Search,
  Type,
  Image,
  Music,
  Video,
  FileText,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react'
import {
  MacOSButton,
  MacOSSheet,
  MacOSSheetContent,
  MacOSScrollArea,
  MacOSInput,
  MacOSSwitch,
} from '@/components/ui'
import type { Model, Modality } from '@/lib/core/providers/types'
import type { ConfigSchema } from '@/lib/core/config/types'
import type { CustomConfig } from '@/lib/core/agent/types'
import { CREATE_MODEL_ID } from '@/lib/core/providers/base'
import { useModelMutations } from '@/hooks/models/useModels'
import { cn } from '@/lib/ui/utils'
import { CustomConfigForm } from '@/components/common/Config/CustomConfigForm'

const ALL_MODALITIES: Modality[] = ['text', 'image', 'audio', 'video', 'pdf']

// 获取 modality 图标
function getModalityIcon(type: Modality, className: string = 'w-4 h-4') {
  switch (type) {
    case 'text':
      return <Type className={className} />
    case 'image':
      return <Image className={className} />
    case 'audio':
      return <Music className={className} />
    case 'video':
      return <Video className={className} />
    case 'pdf':
      return <FileText className={className} />
  }
}

// 编辑中的模型数据结构
interface EditingModel {
  id: string
  name: string
  toolCall: boolean
  reasoning: boolean
  attachment: boolean
  temperature: boolean
  limitContext: number
  limitOutput: number
  costInput: number
  costOutput: number
  inputModalities: Modality[]
  outputModalities: Modality[]
  openWeights: boolean
  knowledge: string
  isNew?: boolean
}

function createDefaultModel(): EditingModel {
  return {
    id: '',
    name: '',
    toolCall: true,
    reasoning: false,
    attachment: false,
    temperature: true,
    limitContext: 128000,
    limitOutput: 8192,
    costInput: 0,
    costOutput: 0,
    inputModalities: ['text'],
    outputModalities: ['text'],
    openWeights: false,
    knowledge: '',
    isNew: true,
  }
}

function modelToEditing(model: Model): EditingModel {
  return {
    id: model.id,
    name: model.name,
    toolCall: model.toolCall,
    reasoning: model.reasoning,
    attachment: model.attachment,
    temperature: model.temperature,
    limitContext: model.limit.context,
    limitOutput: model.limit.output,
    costInput: model.cost.input,
    costOutput: model.cost.output,
    inputModalities: model.modalities.input,
    outputModalities: model.modalities.output,
    openWeights: model.openWeights,
    knowledge: model.knowledge || '',
  }
}

function editingToModel(editing: EditingModel): Model {
  const now = new Date().toISOString().split('T')[0]
  return {
    id: editing.id,
    name: editing.name || editing.id,
    attachment: editing.attachment,
    reasoning: editing.reasoning,
    toolCall: editing.toolCall,
    temperature: editing.temperature,
    knowledge: editing.knowledge,
    releaseDate: now,
    lastUpdated: now,
    modalities: {
      input: editing.inputModalities,
      output: editing.outputModalities,
    },
    openWeights: editing.openWeights,
    cost: {
      input: editing.costInput,
      output: editing.costOutput,
    },
    limit: {
      context: editing.limitContext,
      output: editing.limitOutput,
    },
    userModified: true,
  }
}

// 模型详情/编辑面板
function ModelDetailPanel({
  model,
  editingModel,
  isCustomProvider,
  customConfigSchema,
  customConfig,
  onCustomConfigChange,
  onSelect,
  onEdit,
  onDelete,
  onEditingChange,
  onSave,
  onCancelEdit,
  saving,
}: {
  model: Model | undefined
  editingModel: EditingModel | null
  isCustomProvider: boolean
  customConfigSchema?: ConfigSchema
  customConfig?: CustomConfig
  onCustomConfigChange?: (key: string, value: unknown) => void
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onEditingChange: (updates: Partial<EditingModel>) => void
  onSave: () => void
  onCancelEdit: () => void
  saving: boolean
}) {
  // 编辑模式
  if (editingModel) {
    const isNew = editingModel.isNew
    const isValid = editingModel.id.trim() !== ''

    const toggleModality = (type: 'input' | 'output', modality: Modality, checked: boolean) => {
      const key = type === 'input' ? 'inputModalities' : 'outputModalities'
      const current = editingModel[key]
      const updated = checked ? [...current, modality] : current.filter((m) => m !== modality)
      onEditingChange({ [key]: updated })
    }

    return (
      <div className="flex-1 p-4 overflow-auto flex flex-col">
        <h3 className="text-base font-semibold mb-4">{isNew ? 'Add Model' : 'Edit Model'}</h3>

        <div className="space-y-4 flex-1">
          {/* ID */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Model ID
            </label>
            <MacOSInput
              value={editingModel.id}
              onChange={(e) => onEditingChange({ id: e.target.value })}
              placeholder="e.g., gpt-4o-mini"
              className="h-8 text-sm"
              disabled={!isNew}
              autoFocus={isNew}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Display Name
            </label>
            <MacOSInput
              value={editingModel.name}
              onChange={(e) => onEditingChange({ name: e.target.value })}
              placeholder="Display name"
              className="h-8 text-sm"
            />
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Context Limit
              </label>
              <MacOSInput
                type="number"
                value={editingModel.limitContext}
                onChange={(e) => onEditingChange({ limitContext: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Output Limit
              </label>
              <MacOSInput
                type="number"
                value={editingModel.limitOutput}
                onChange={(e) => onEditingChange({ limitOutput: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                { key: 'toolCall', label: 'Tools' },
                { key: 'reasoning', label: 'Reasoning' },
                { key: 'attachment', label: 'Attachment' },
                { key: 'temperature', label: 'Temperature' },
                { key: 'openWeights', label: 'Open Weights' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <MacOSSwitch
                    checked={editingModel[key as keyof EditingModel] as boolean}
                    onCheckedChange={(checked) => onEditingChange({ [key]: checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Modalities */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
              Modalities
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs w-12">Input:</span>
                <div className="flex items-center gap-3">
                  {ALL_MODALITIES.map((m) => (
                    <label key={m} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingModel.inputModalities.includes(m)}
                        onChange={(e) => toggleModality('input', m, e.target.checked)}
                        className="rounded"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-12">Output:</span>
                <div className="flex items-center gap-3">
                  {ALL_MODALITIES.map((m) => (
                    <label key={m} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingModel.outputModalities.includes(m)}
                        onChange={(e) => toggleModality('output', m, e.target.checked)}
                        className="rounded"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Input Price ($/M)
              </label>
              <MacOSInput
                type="number"
                step="0.01"
                value={editingModel.costInput}
                onChange={(e) => onEditingChange({ costInput: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Output Price ($/M)
              </label>
              <MacOSInput
                type="number"
                step="0.01"
                value={editingModel.costOutput}
                onChange={(e) => onEditingChange({ costOutput: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/10">
          <div className="flex-1" />
          <MacOSButton variant="ghost" size="sm" onClick={onCancelEdit} disabled={saving}>
            Cancel
          </MacOSButton>
          <MacOSButton variant="default" size="sm" onClick={onSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : isNew ? 'Add Model' : 'Save'}
          </MacOSButton>
        </div>
      </div>
    )
  }

  // 查看模式
  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select a model to see details
      </div>
    )
  }

  const inputs = [...new Set(model.modalities.input || [])]
  const outputs = [...new Set(model.modalities.output || [])]

  const capabilities = [
    { label: 'Tools', enabled: model.toolCall },
    { label: 'Reasoning', enabled: model.reasoning },
    { label: 'Attachment', enabled: model.attachment },
    { label: 'Temperature', enabled: model.temperature },
    { label: 'Open Weights', enabled: model.openWeights },
  ]

  const modelConfigSchema = model.configSchema || customConfigSchema

  return (
    <div className="flex-1 p-4 overflow-auto flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{model.name || model.id}</h3>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{model.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Knowledge & Release Date */}
          {(model.knowledge || model.releaseDate) && (
            <div className="text-[10px] text-muted-foreground text-right">
              {model.knowledge && <div>{model.knowledge}</div>}
              {model.releaseDate && <div>{model.releaseDate}</div>}
            </div>
          )}
          {isCustomProvider && (
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="p-1.5 rounded hover:bg-accent cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-destructive/10 cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats & Modalities & Price */}
      <div className="flex items-start gap-6 mt-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Context
          </div>
          <div className="text-sm font-medium tabular-nums">
            {model.limit.context > 0 ? model.limit.context.toLocaleString() : '-'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Output
          </div>
          <div className="text-sm font-medium tabular-nums">
            {model.limit.output > 0 ? model.limit.output.toLocaleString() : '-'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Modalities
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {inputs.map((m) => (
              <span key={m} title={m}>
                {getModalityIcon(m, 'w-4 h-4')}
              </span>
            ))}
            <ArrowRight className="w-3 h-3 mx-0.5" />
            {outputs.map((m) => (
              <span key={m} title={m}>
                {getModalityIcon(m, 'w-4 h-4')}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Price
          </div>
          <div className="text-sm font-medium tabular-nums">
            ${model.cost.input} / ${model.cost.output}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Capabilities
        </div>
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map(({ label, enabled }) => (
            <span
              key={label}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                enabled ? 'bg-accent text-foreground' : 'bg-muted/30 text-muted-foreground/50',
              )}
            >
              {enabled ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Custom Config */}
      {modelConfigSchema && Object.keys(modelConfigSchema).length > 0 && onCustomConfigChange && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Options
          </div>
          <CustomConfigForm
            schema={modelConfigSchema}
            values={customConfig?.configs || {}}
            onChange={onCustomConfigChange}
          />
        </div>
      )}

      {/* Select Button */}
      <div className="mt-auto pt-4">
        <MacOSButton variant="default" size="sm" onClick={onSelect} className="w-full">
          <Check className="w-4 h-4 mr-1.5" />
          Use this Model
        </MacOSButton>
      </div>
    </div>
  )
}

interface ModelSelectModalProps {
  models: Model[]
  selectedModelId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (modelId: string) => void
  /** Provider ID for model mutations */
  providerId: string
  /** Whether the provider is custom (enables edit/add) */
  isCustomProvider?: boolean
  /** Custom config schema for the current model */
  customConfigSchema?: ConfigSchema
  /** Current custom config values */
  customConfig?: CustomConfig
  /** Callback when custom config changes */
  onCustomConfigChange?: (key: string, value: unknown) => void
  /** Callback when models are changed (added/edited/deleted) */
  onModelsChanged?: () => void
}

export function ModelSelectModal({
  models,
  selectedModelId,
  isOpen,
  onClose,
  onSelect,
  providerId,
  isCustomProvider = false,
  customConfigSchema,
  customConfig,
  onCustomConfigChange,
  onModelsChanged,
}: ModelSelectModalProps) {
  // 当前查看的 model id（点击侧边栏选中但未确认）
  const [viewingModelId, setViewingModelId] = useState<string>(selectedModelId)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null)

  const { createModel, updateModel, deleteModel } = useModelMutations(providerId)
  const saving = createModel.isPending || updateModel.isPending

  // 过滤掉 CREATE_MODEL_ID
  const allModels = models.filter((m) => m.id !== CREATE_MODEL_ID)

  // 根据搜索词过滤
  const displayModels = searchQuery
    ? allModels.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allModels

  // 当前查看的模型
  const viewingModel = editingModel ? undefined : displayModels.find((m) => m.id === viewingModelId)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // 打开时重置为当前选中的 model
      setViewingModelId(selectedModelId)
    } else {
      setEditingModel(null)
      setSearchQuery('')
    }
  }, [isOpen, selectedModelId])

  // 点击侧边栏选中 model（只预览，不确认）
  const handleViewModel = (model: Model) => {
    setViewingModelId(model.id)
  }

  // 点击 "Use this Model" 确认选择并关闭
  const handleConfirmSelect = () => {
    if (viewingModelId) {
      onSelect(viewingModelId)
      onClose()
    }
  }

  const handleAddNew = () => {
    setEditingModel(createDefaultModel())
  }

  const handleEdit = (model: Model) => {
    setEditingModel(modelToEditing(model))
  }

  const handleDelete = (model: Model) => {
    deleteModel.mutate(model.id, {
      onSuccess: () => onModelsChanged?.(),
      onError: (error) => console.error('Failed to delete model:', error),
    })
  }

  const handleSave = () => {
    if (!editingModel) return

    const modelData = editingToModel(editingModel)
    const onSuccess = () => {
      setEditingModel(null)
      onModelsChanged?.()
    }
    const onError = (error: Error) => {
      console.error('Failed to save model:', error)
    }

    if (editingModel.isNew) {
      createModel.mutate(modelData, { onSuccess, onError })
    } else {
      updateModel.mutate(modelData, { onSuccess, onError })
    }
  }

  const handleCancelEdit = () => {
    setEditingModel(null)
  }

  const handleEditingChange = (updates: Partial<EditingModel>) => {
    if (editingModel) {
      setEditingModel({ ...editingModel, ...updates })
    }
  }

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="640px" height="540px">
      <MacOSSheetContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">Select Model</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allModels.length} models available
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Model List (Left) */}
          <div className="w-[180px] border-r border-border/20 flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-border/10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <MacOSInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-7 h-7 text-xs"
                />
              </div>
            </div>

            <MacOSScrollArea className="flex-1 [&>div>div]:!block">
              <div className="py-0.5">
                {/* New model item (when editing) */}
                {editingModel?.isNew && (
                  <div className={cn('px-2 py-1.5 cursor-pointer overflow-hidden', 'bg-accent')}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 flex-shrink-0">
                        <Plus className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium">New Model</span>
                    </div>
                  </div>
                )}
                {displayModels.length === 0 ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                    No models found
                  </div>
                ) : (
                  displayModels.map((model) => {
                    const isEditing =
                      editingModel && !editingModel.isNew && editingModel.id === model.id
                    const isViewing = viewingModelId === model.id
                    return (
                      <div
                        key={model.id}
                        className={cn(
                          'px-2 py-1.5 cursor-pointer overflow-hidden',
                          'hover:bg-accent/50',
                          (isViewing || isEditing) && 'bg-accent',
                        )}
                        onClick={() => {
                          if (editingModel) {
                            // 编辑模式下点击列表项切换编辑目标
                            if (isCustomProvider) {
                              setEditingModel(modelToEditing(model))
                            }
                          } else {
                            // 点击只选中预览，不关闭
                            handleViewModel(model)
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5 px-2 justify-between">
                          <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                            {model.name || model.id}
                          </span>
                          <div className="w-3 h-3 flex-shrink-0">
                            {selectedModelId === model.id && !editingModel && (
                              <Check className="w-3 h-3 text-foreground" />
                            )}
                            {isEditing && <Pencil className="w-3 h-3 text-foreground" />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </MacOSScrollArea>

            {/* Add Model Button (for custom providers) */}
            {isCustomProvider && (
              <div className="border-t border-border/20 p-2">
                <MacOSButton
                  variant="ghost"
                  size="sm"
                  onClick={handleAddNew}
                  disabled={editingModel?.isNew}
                  className="w-full justify-start"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Model
                </MacOSButton>
              </div>
            )}
          </div>

          {/* Model Detail (Right) */}
          <ModelDetailPanel
            model={viewingModel}
            editingModel={editingModel}
            isCustomProvider={isCustomProvider}
            customConfigSchema={customConfigSchema}
            customConfig={customConfig}
            onCustomConfigChange={onCustomConfigChange}
            onSelect={handleConfirmSelect}
            onEdit={() => viewingModel && handleEdit(viewingModel)}
            onDelete={() => viewingModel && handleDelete(viewingModel)}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            saving={saving}
          />
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}
