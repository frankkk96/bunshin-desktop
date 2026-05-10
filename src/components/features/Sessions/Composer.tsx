import { useState, type KeyboardEvent } from 'react'
import { Paperclip, Send, Square, X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { MacOSButton, MacOSTextarea } from '@/components/ui'
import { cn } from '@/lib/ui/utils'

interface ComposerProps {
  disabled?: boolean
  canCancel?: boolean
  onSend: (text: string, attachments: any[]) => Promise<void> | void
  onCancel: () => void
}

interface PickedAttachment {
  // Preview metadata for the chip + the encoded payload we'll send.
  name: string
  mediaType: string
  block: any
}

interface MediaPickerResult {
  media: {
    localPath: string
    name: string
    type: string
    mimeType: string
  } | null
  cancelled: boolean
  error: string | null
}

export function Composer({ disabled, canCancel, onSend, onCancel }: ComposerProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])
  const [busy, setBusy] = useState(false)

  const handleAttach = async () => {
    try {
      const result = await invoke<MediaPickerResult>('select_media_from_library', {
        mediaTypes: ['image', 'pdf'],
      })
      if (result.cancelled || !result.media) return
      const m = result.media
      const base64 = await invoke<string>('media_get_base64', { media: m })
      // `media_get_base64` returns a data: URL. Strip the prefix for content-block payloads.
      const data = base64.startsWith('data:') ? base64.split(',', 2)[1] ?? base64 : base64
      const block =
        m.type === 'image'
          ? {
              type: 'image',
              source: { type: 'base64', media_type: m.mimeType, data },
            }
          : {
              type: 'document',
              source: { type: 'base64', media_type: m.mimeType, data },
            }
      setAttachments((prev) => [...prev, { name: m.name, mediaType: m.type, block }])
    } catch (err) {
      console.error('attach failed', err)
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    if (busy) return
    setBusy(true)
    try {
      await onSend(trimmed, attachments.map((a) => a.block))
      setText('')
      setAttachments([])
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {attachments.map((a, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-0.5"
            >
              {a.mediaType}: {a.name}
              <button onClick={() => removeAttachment(idx)} className="text-muted-foreground">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <MacOSButton variant="icon" onClick={handleAttach} disabled={disabled}>
          <Paperclip size={16} />
        </MacOSButton>
        <MacOSTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={disabled ? 'Subprocess not running…' : 'Message Claude · ⌘↵ to send'}
          rows={2}
          disabled={disabled || busy}
          className={cn('flex-1 resize-none', disabled && 'opacity-60')}
        />
        {canCancel && (
          <MacOSButton variant="icon" onClick={onCancel}>
            <Square size={16} />
          </MacOSButton>
        )}
        <MacOSButton onClick={handleSend} disabled={disabled || busy}>
          <Send size={16} />
        </MacOSButton>
      </div>
    </div>
  )
}
