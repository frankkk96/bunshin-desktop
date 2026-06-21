import { useState, type KeyboardEvent } from 'react'
import { IoArrowUpCircle, IoStopCircleOutline, IoImageOutline } from 'react-icons/io5'
import { X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { IconButton } from '@/components/common'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/ui/utils'
import { useT } from '@/lib/i18n'

interface ComposerProps {
  disabled?: boolean
  disabledHint?: string
  canCancel?: boolean
  onSend: (text: string, attachments: any[]) => Promise<void> | void
  onCancel: () => void
}

interface PickedAttachment {
  name: string
  mediaType: string
  block: any
}

interface MediaPickerResult {
  media: { localPath: string; name: string; type: string; mimeType: string } | null
  cancelled: boolean
  error: string | null
}

export function Composer({
  disabled,
  disabledHint,
  canCancel,
  onSend,
  onCancel,
}: ComposerProps) {
  const t = useT()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])
  const [busy, setBusy] = useState(false)

  const ready = (text.trim().length > 0 || attachments.length > 0) && !disabled && !busy

  const handleAttach = async () => {
    try {
      const result = await invoke<MediaPickerResult>('select_media_from_library', {
        mediaTypes: ['image', 'pdf'],
      })
      if (result.cancelled || !result.media) return
      const m = result.media
      const base64 = await invoke<string>('media_get_base64', { media: m })
      const data = base64.startsWith('data:') ? base64.split(',', 2)[1] ?? base64 : base64
      const block =
        m.type === 'image'
          ? { type: 'image', source: { type: 'base64', media_type: m.mimeType, data } }
          : { type: 'document', source: { type: 'base64', media_type: m.mimeType, data } }
      setAttachments((prev) => [...prev, { name: m.name, mediaType: m.type, block }])
    } catch (err) {
      console.error('attach failed', err)
    }
  }

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx))

  const handleSend = async () => {
    if (!ready) return
    setBusy(true)
    try {
      await onSend(text.trim(), attachments.map((a) => a.block))
      setText('')
      setAttachments([])
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="p-3 px-4 relative bg-background">
      <div className="flex justify-center">
        <div
          className={cn(
            'relative rounded-xl border p-3 min-h-[80px] w-full bg-input border-border',
            disabled && 'opacity-60',
          )}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] bg-background border border-border rounded px-2 py-0.5"
                >
                  <span className="text-muted-foreground">{a.mediaType}:</span>
                  <span className="max-w-[160px] truncate">{a.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              disabled
                ? disabledHint ?? t('composer.notRunning')
                : t('composer.placeholder')
            }
            rows={2}
            disabled={disabled || busy}
            className="w-full border-none bg-transparent text-sm outline-none resize-none pb-10 pr-12 min-h-[30px] max-h-[160px] leading-snug text-foreground"
            style={{ overflow: text.split('\n').length > 5 ? 'auto' : 'hidden' }}
          />

          <div className="absolute bottom-2 left-2 flex gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <IconButton onClick={handleAttach} disabled={disabled}>
                    <IoImageOutline size={20} className="text-muted-foreground" />
                  </IconButton>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Attach image / PDF
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="absolute bottom-1 right-1 flex gap-1">
            {canCancel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <IconButton onClick={onCancel}>
                      <IoStopCircleOutline size={32} className="text-foreground" />
                    </IconButton>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Stop generating
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <IconButton onClick={handleSend} disabled={!ready}>
                    <IoArrowUpCircle
                      size={32}
                      className={!ready ? 'text-muted-foreground' : 'text-foreground'}
                    />
                  </IconButton>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Send (Enter)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
