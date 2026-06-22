import { cn } from '@/lib/ui/utils'
import type { Agent } from '@/lib/types'

interface AgentAvatarProps {
  agent: Pick<Agent, 'avatar' | 'alias'> | null | undefined
  size?: number
  className?: string
}

function hashString(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash
}

/** Up to two initials: first letter of the first two words, else the first letter. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * A small, curated set of refined same-hue gradients (light → deeper shade).
 * Muted and harmonious rather than a full-spectrum rainbow, so a wall of agents
 * reads as elegant instead of busy.
 */
const GRADIENTS: [string, string][] = [
  ['#6366f1', '#4338ca'], // indigo
  ['#0ea5e9', '#0369a1'], // sky
  ['#0d9488', '#0f766e'], // teal
  ['#10b981', '#047857'], // emerald
  ['#8b5cf6', '#6d28d9'], // violet
  ['#e11d48', '#9f1239'], // rose
  ['#d97706', '#b45309'], // amber
  ['#64748b', '#334155'], // slate
]

/**
 * A deterministic, name-generated avatar: initials over a diagonal gradient
 * picked from a curated palette by the name hash. Same name → same avatar.
 */
export function AgentAvatar({ agent, size = 32, className }: AgentAvatarProps) {
  const radius = Math.min(8, Math.max(4, Math.round(size * 0.18)))
  const name = agent?.alias?.trim() ?? ''
  const [from, to] = GRADIENTS[hashString(name || '?') % GRADIENTS.length]
  const fontSize = Math.max(10, Math.round(size * 0.4))

  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0 select-none font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize,
        lineHeight: `${size}px`,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
      }}
    >
      {initials(name)}
    </div>
  )
}
