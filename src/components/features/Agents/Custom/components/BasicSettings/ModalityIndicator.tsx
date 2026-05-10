import { Type, Image, Music, Video, ArrowRight, FileText } from 'lucide-react'
import type { Model, Modality } from '@/lib/core/providers/types'

/**
 * 获取模态类型对应的图标
 */
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

interface ModalityIndicatorProps {
  model: Model
}

/**
 * 渲染模型的输入输出模态指示器
 */
export function ModalityIndicator({ model }: ModalityIndicatorProps) {
  // modalities.input and modalities.output are Modality[] arrays
  const uniqueInputs = [...new Set(model.modalities.input || [])]
  const uniqueOutputs = [...new Set(model.modalities.output || [])]

  // Define display order
  const order: Modality[] = ['text', 'image', 'audio', 'video', 'pdf']
  const sortByOrder = (a: Modality, b: Modality) => order.indexOf(a) - order.indexOf(b)

  uniqueInputs.sort(sortByOrder)
  uniqueOutputs.sort(sortByOrder)

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {/* Context length */}
      {model.limit.context > 0 && (
        <span className="tabular-nums">{model.limit.context.toLocaleString()}</span>
      )}
      {model.limit.context > 0 && (uniqueInputs.length > 0 || uniqueOutputs.length > 0) && (
        <span className="opacity-50">·</span>
      )}
      {/* Input modalities */}
      {uniqueInputs.length > 0 && (
        <span className="flex items-center gap-0.5">
          {uniqueInputs.map((type) => (
            <span key={`in-${type}`}>{getModalityIcon(type)}</span>
          ))}
        </span>
      )}
      {/* Arrow */}
      {uniqueInputs.length > 0 && uniqueOutputs.length > 0 && <ArrowRight className="w-3 h-3" />}
      {/* Output modalities */}
      {uniqueOutputs.length > 0 && (
        <span className="flex items-center gap-0.5">
          {uniqueOutputs.map((type) => (
            <span key={`out-${type}`}>{getModalityIcon(type)}</span>
          ))}
        </span>
      )}
    </span>
  )
}
