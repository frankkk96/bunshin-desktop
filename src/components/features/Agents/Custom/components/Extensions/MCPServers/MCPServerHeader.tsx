import { ProviderIcon } from '@/components/common/Icons/ProviderIcon'

interface MCPServerHeaderProps {
  name: string
  description: string
  avatar?: string
}

export function MCPServerHeader({ name, description, avatar }: MCPServerHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-4 pt-4 pb-3">
      <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
        {avatar ? (
          <ProviderIcon provider={avatar} size={24} />
        ) : (
          <span className="text-base font-medium">{name?.charAt(0)?.toUpperCase() || 'M'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold">{name || 'MCP Server Configuration'}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  )
}
