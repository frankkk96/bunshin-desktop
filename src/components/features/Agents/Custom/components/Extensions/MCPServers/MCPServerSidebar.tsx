import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Plus, Loader2, AlertCircle, Ban } from 'lucide-react'
import type { MCPServerBuilderConfig } from '@/lib/core/extensions/mcp-servers/types'
import { cn } from '@/lib/ui/utils'
import { ConnectionStatus } from '@/hooks/status/types'
import { useStatusStore, selectExtensionStatus } from '@/stores/status-store'
import { ProviderIcon } from '@/components/common/Icons/ProviderIcon'

interface MCPServerSidebarProps {
  servers: MCPServerBuilderConfig[]
  builtinServers: MCPServerBuilderConfig[]
  selectedId: string | null
  isCreating: boolean
  onSelect: (serverId: string) => void
  onAddCustomServer: (type: 'stdio' | 'http') => void
}

// 分组标题组件
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
      {title}
    </div>
  )
}

// 服务器列表项组件
function ServerListItem({
  server,
  isSelected,
  onSelect,
  variant = 'configured',
}: {
  server: MCPServerBuilderConfig
  isSelected: boolean
  onSelect: (serverId: string) => void
  variant?: 'configured' | 'available'
}) {
  const serverStatus = useStatusStore(selectExtensionStatus(server.id))
  const connectionStatus = serverStatus?.connectionStatus
  const enabled = server.enabled !== false
  const isAvailable = variant === 'available'

  // Determine status icon (only for configured servers)
  let statusIcon = null
  if (!isAvailable) {
    if (!enabled) {
      statusIcon = <Ban className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
    } else if (connectionStatus === ConnectionStatus.Connected) {
      statusIcon = <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
    } else if (connectionStatus === ConnectionStatus.Connecting) {
      statusIcon = <Loader2 className="w-3 h-3 text-blue-500 flex-shrink-0 animate-spin" />
    } else if (connectionStatus === ConnectionStatus.Error) {
      statusIcon = <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
    }
  }

  return (
    <div
      className={cn(
        'px-2 py-1.5 cursor-pointer overflow-hidden',
        'hover:bg-accent/50',
        isSelected && 'bg-accent',
        isAvailable && 'opacity-70',
      )}
      onClick={() => onSelect(server.id)}
    >
      <div className="px-2 flex items-center gap-2 min-w-0">
        {/* Avatar icon */}
        <div className="flex-shrink-0">
          {server.avatar ? (
            <ProviderIcon provider={server.avatar} size={14} />
          ) : (
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        <span
          className={cn(
            'text-xs text-ellipsis overflow-hidden whitespace-nowrap flex-1',
            isAvailable && 'text-muted-foreground',
          )}
        >
          {server.name}
        </span>
        {statusIcon}
      </div>
    </div>
  )
}

export function MCPServerSidebar({
  servers,
  builtinServers,
  selectedId,
  isCreating,
  onSelect,
  onAddCustomServer,
}: MCPServerSidebarProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // 获取已配置的 server types
  const configuredTypes = new Set(servers.map((s) => s.type))

  // 过滤掉已经配置过的 builtin server
  const availableBuiltinServers = builtinServers.filter((s) => !configuredTypes.has(s.type))

  const hasConfigured = servers.length > 0 || isCreating
  const hasAvailable = availableBuiltinServers.length > 0

  return (
    <div className="w-[200px] border-r border-border/20 flex flex-col">
      {/* Server list */}
      <div className="flex-1 overflow-y-auto">
        {/* Configured Servers Section */}
        {hasConfigured && (
          <div className="pt-1">
            <SectionHeader title="Configured" />
            {/* New Server (when creating) */}
            {isCreating && (
              <div className={cn('px-2 py-1.5 cursor-pointer overflow-hidden', 'bg-accent')}>
                <div className="px-2 flex items-center gap-2 min-w-0">
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium">New Server</span>
                </div>
              </div>
            )}
            {servers.map((server) => (
              <ServerListItem
                key={server.id}
                server={server}
                isSelected={selectedId === server.id}
                onSelect={onSelect}
                variant="configured"
              />
            ))}
          </div>
        )}

        {/* Available Builtin Servers Section */}
        {hasAvailable && (
          <div className={cn('pt-1', hasConfigured && 'mt-2 border-t border-border/10')}>
            <SectionHeader title="Available" />
            {availableBuiltinServers.map((server) => (
              <ServerListItem
                key={server.id}
                server={server}
                isSelected={selectedId === server.id}
                onSelect={onSelect}
                variant="available"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasConfigured && !hasAvailable && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No servers available
          </div>
        )}
      </div>

      {/* Add Custom Server at bottom */}
      <div className="border-t border-border/20 p-2 relative" ref={menuRef}>
        <button
          onClick={() => !isCreating && setShowMenu(!showMenu)}
          disabled={isCreating}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer text-xs text-muted-foreground hover:bg-accent/50',
            isCreating && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Plus className="w-3 h-3" />
          Add Custom Server
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-2 mb-1 w-44 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50">
            <button
              onClick={() => {
                onAddCustomServer('stdio')
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-accent cursor-pointer"
            >
              STDIO Server
            </button>
            <button
              onClick={() => {
                onAddCustomServer('http')
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-accent cursor-pointer"
            >
              HTTP Server
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
