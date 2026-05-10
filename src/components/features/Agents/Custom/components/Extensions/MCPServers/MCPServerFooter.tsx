import { Loader2 } from 'lucide-react'
import { ExtensionStatus } from '@/lib/core/extensions/types'
import { MacOSSwitch } from '@/components/ui/macos/macos-switch'
import { MacOSButton } from '@/components/ui/macos/macos-button'
import { ConnectionStatus } from '@/hooks/status/types'

interface MCPServerFooterProps {
  status: ExtensionStatus | null
  name: string
  currentServer: any
  enabled: boolean
  onSaveAndConnect: () => void
  onToggleEnabled: () => void
  onDelete?: () => void
  onCancelConnection?: () => void
}

export function MCPServerFooter({
  status,
  name,
  currentServer,
  enabled,
  onSaveAndConnect,
  onToggleEnabled,
  onDelete,
  onCancelConnection,
}: MCPServerFooterProps) {
  const isConnecting = status?.connectionStatus === ConnectionStatus.Connecting

  return (
    <div className="border-t border-border/10 px-4 py-3 flex items-center gap-2">
      {/* Left side - Delete button (only for non-builtin) */}
      {onDelete && (
        <MacOSButton
          onClick={onDelete}
          variant="ghost"
          size="sm"
          disabled={isConnecting}
          className="text-destructive hover:text-destructive disabled:opacity-50"
          title={isConnecting ? 'Cannot delete while connecting' : undefined}
        >
          Delete
        </MacOSButton>
      )}

      {/* Enable/Disable toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Enabled</span>
        <MacOSSwitch checked={enabled} onCheckedChange={onToggleEnabled} disabled={isConnecting} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Cancel or Save & Connect */}
      {isConnecting ? (
        <MacOSButton onClick={onCancelConnection} variant="outline" size="sm">
          <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
          Cancel
        </MacOSButton>
      ) : (
        <MacOSButton
          onClick={onSaveAndConnect}
          disabled={!name || !currentServer || !enabled}
          variant="default"
          size="sm"
        >
          Save & Connect
        </MacOSButton>
      )}
    </div>
  )
}
