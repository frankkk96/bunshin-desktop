import type { ReactNode } from 'react'
import { cn } from '@/lib/ui/utils'

/** A subtle group heading, optionally with a control (e.g. a link) on the right. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        {title}
      </span>
      {right}
    </div>
  )
}

/**
 * A horizontal config field: label on the left, control on the right.
 * Use `align="start"` for tall controls (textareas) so the label sits at the top.
 */
export function FieldRow({
  label,
  hint,
  children,
  align = 'center',
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  align?: 'center' | 'start'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      )}
    >
      <div className={cn('w-24 flex-shrink-0', align === 'start' && 'pt-1.5')}>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] leading-tight text-muted-foreground/60 mt-0.5">{hint}</div>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
