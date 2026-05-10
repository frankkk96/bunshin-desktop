import { CheckCircle, AlertCircle } from 'lucide-react'
import { ExtensionStatus } from '@/lib/core/extensions/types'
import { ConnectionStatus } from '@/hooks/status/types'

export function MCPServerStatus({ status }: { status: ExtensionStatus | null }) {
  if (!status) return null

  const isConnected = status.connectionStatus === ConnectionStatus.Connected
  const hasError = status.connectionStatus === ConnectionStatus.Error

  if (!isConnected && !hasError) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Connection Success */}
      {isConnected && (
        <>
          <div className="flex items-center gap-2 text-xs font-medium text-green-500">
            <CheckCircle className="w-4 h-4" />
            Connected Successfully
          </div>
          {status.extensionTools.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Available Tools ({status.extensionTools.length})
              </div>
              <div className="space-y-1.5">
                {status.extensionTools.map((tool) => (
                  <div key={tool.name} className="p-2.5 bg-accent/20 rounded text-xs">
                    <div className="font-medium">{tool.name}</div>
                    {tool.description && (
                      <div className="text-muted-foreground mt-1 line-clamp-2">
                        {tool.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Connection Error */}
      {hasError && status.issues.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-500">Connection Failed</div>
            <div className="text-muted-foreground mt-1">{status.issues[0]}</div>
          </div>
        </div>
      )}
    </div>
  )
}
