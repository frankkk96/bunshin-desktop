import { LucideIcon } from 'lucide-react'

interface SettingSectionProps {
  title: string
  children: React.ReactNode
  icon?: LucideIcon
}

export function SettingSection({ title, children, icon: Icon }: SettingSectionProps) {
  return (
    <div className="">
      <div className="text-xs flex items-center gap-2 uppercase font-medium text-muted-foreground/70 tracking-wide mb-2 select-none">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </div>
      <div className="bg-accent/30 border border-border rounded-lg overflow-hidden px-0 py-0">
        {children}
      </div>
    </div>
  )
}
