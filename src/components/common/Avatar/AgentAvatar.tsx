import { convertFileSrc } from '@tauri-apps/api/core'
import { cn } from '@/lib/ui/utils'
import type { Agent } from '@/lib/types'

interface AgentAvatarProps {
  agent: Pick<Agent, 'avatar' | 'alias'> | null | undefined
  size?: number
  className?: string
}

const PALETTE = [
  'bg-rose-200 text-rose-900',
  'bg-amber-200 text-amber-900',
  'bg-lime-200 text-lime-900',
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-indigo-200 text-indigo-900',
  'bg-violet-200 text-violet-900',
  'bg-pink-200 text-pink-900',
]

function pickColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** A stored avatar value is an image path if it points at a local file. */
function isImagePath(value: string): boolean {
  return (
    value.startsWith('/') ||
    value.startsWith('file://') ||
    /^[a-zA-Z]:[\\/]/.test(value) // windows drive letter
  )
}

export function AgentAvatar({ agent, size = 32, className }: AgentAvatarProps) {
  const radius = Math.min(8, Math.max(4, Math.round(size * 0.18)))
  const stored = agent?.avatar?.trim() ?? ''

  if (stored && isImagePath(stored)) {
    const src = stored.startsWith('file://') ? stored : convertFileSrc(stored)
    return (
      <img
        src={src}
        alt={agent?.alias ?? ''}
        className={cn('flex-shrink-0 object-cover bg-muted', className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    )
  }

  const label = stored || agent?.alias?.trim()?.[0]?.toUpperCase() || '?'
  const fontSize = Math.max(11, Math.round(size * 0.45))
  const colors = pickColor(agent?.alias ?? '')

  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0 select-none font-semibold',
        colors,
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize,
        lineHeight: `${size}px`,
      }}
    >
      {label}
    </div>
  )
}
