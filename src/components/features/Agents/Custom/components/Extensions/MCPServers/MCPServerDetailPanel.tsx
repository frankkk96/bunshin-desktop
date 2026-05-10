import { useState, useEffect, useRef } from 'react'
import type {
  CustomMCPServerConfig,
  MCPServerBuilderConfig,
} from '@/lib/core/extensions/mcp-servers/types'
import { logger } from '@/lib/core/utils/logger'
import { useStatusStore, selectExtensionStatus } from '@/stores/status-store'
import { MCPServerHeader } from './MCPServerHeader'
import { MCPServerConfigForm } from './MCPServerConfigForm'
import { MCPServerStatus } from './MCPServerStatus'
import { MCPServerFooter } from './MCPServerFooter'
import { extensionService } from '@/lib/core/extensions/extension-service'
import { getBuilderByType } from '@/lib/core/extensions/mcp-servers/builder'
import { mcpApi } from '@/lib/tauri/service/mcp'

interface MCPServerDetailPanelProps {
  selectedId: string | null
  servers: MCPServerBuilderConfig[]
  builtinServers: MCPServerBuilderConfig[]
  newServer?: MCPServerBuilderConfig // 新建服务器时的临时配置
  onSave: (server: MCPServerBuilderConfig) => Promise<void>
  onDelete?: (serverId: string) => Promise<void>
}

export function MCPServerDetailPanel({
  selectedId,
  servers,
  builtinServers,
  newServer,
  onSave,
  onDelete,
}: MCPServerDetailPanelProps) {
  // 判断是否是新建模式
  const isCreating = selectedId === '__new__' && newServer !== undefined

  // Get current selected server from servers list
  // 首先直接按 id 查找
  let foundInServers = servers.find((s) => s.id === selectedId)
  const foundInBuiltin = builtinServers.find((s) => s.id === selectedId)

  const foundServer = isCreating ? newServer : foundInServers || foundInBuiltin

  // 判断是否是 builtin（在 builtin 列表中但不在已添加列表中）
  const isBuiltin = !isCreating && !foundInServers && !!foundInBuiltin

  // 使用 ref 保持上一个有效的 server，避免切换时闪烁
  const lastValidServerRef = useRef<MCPServerBuilderConfig | null>(null)
  if (foundServer) {
    lastValidServerRef.current = foundServer
  }

  // 优先使用找到的 server，否则使用上一个有效的（避免闪烁）
  const currentServer = foundServer || lastValidServerRef.current
  const selectedBuilder = currentServer
    ? getBuilderByType(currentServer.id, currentServer.type)
    : null

  // Right panel - configuration
  const [config, setConfig] = useState<Record<string, any>>({})
  const [enabled, setEnabled] = useState(true)

  // 从 Zustand Store 订阅状态
  const serverStatus = useStatusStore(selectExtensionStatus(selectedId || ''))

  // Track which server we've loaded config for
  const loadedServerIdRef = useRef<string | null>(null)

  // Reset form when switching to a different server
  // Only update when we have actual server data and it's a different server
  useEffect(() => {
    const serverId = foundServer?.id || null

    // Only reload config when switching to a different server
    if (foundServer && serverId !== loadedServerIdRef.current) {
      loadedServerIdRef.current = serverId
      const serverConfig = foundServer.config as any
      if (
        (foundServer.type === 'custom-stdio' || foundServer.type === 'custom-http') &&
        serverConfig.config
      ) {
        setConfig({
          name: foundServer.name,
          ...serverConfig.config,
        })
      } else {
        setConfig(serverConfig)
      }
      setEnabled(foundServer.enabled)
    }
  }, [foundServer])

  const buildServerPayload = (enabledState: boolean): MCPServerBuilderConfig | null => {
    if (!currentServer) return null

    if (currentServer.type === 'custom-stdio' || currentServer.type === 'custom-http') {
      const customConfig = currentServer.config as CustomMCPServerConfig
      const { name: configName, ...serverConfig } = config
      const configuredName = (configName as string | undefined)?.trim() || currentServer.name

      if (!configuredName) {
        return null
      }

      return {
        id: currentServer.id,
        name: configuredName,
        description: currentServer.description,
        avatar: currentServer.avatar,
        type: currentServer.type,
        config: {
          type: customConfig.type,
          config: serverConfig as CustomMCPServerConfig['config'],
        },
        enabled: enabledState,
      }
    }

    return {
      id: currentServer.id,
      name: currentServer.name,
      description: currentServer.description,
      avatar: currentServer.avatar,
      type: currentServer.type,
      config: { ...config } as MCPServerBuilderConfig['config'],
      enabled: enabledState,
    }
  }

  // Handle save and connect
  const handleSaveAndConnect = async () => {
    if (!currentServer) return

    const server = buildServerPayload(true)
    if (!server) {
      return
    }

    // 先保存到父组件（父组件会处理 selectedId 的更新）
    await onSave(server)
    // 再启动连接
    await extensionService.upsertMCPServer(server)
  }

  // Handle toggle enabled/disabled
  const handleToggleEnabled = async () => {
    if (!currentServer) return

    const newEnabled = !enabled
    setEnabled(newEnabled)

    const server = buildServerPayload(newEnabled)
    if (!server) {
      setEnabled(!newEnabled)
      return
    }

    try {
      if (newEnabled) {
        await extensionService.startExtension(server.id)
      } else {
        await extensionService.stopExtension(server.id)
      }
      await onSave(server)
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      if (errorMessage.includes('User cancelled')) {
        setEnabled(!newEnabled)
      } else {
        setEnabled(!newEnabled)
      }
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!currentServer || !onDelete) return

    try {
      await extensionService.deleteMCPServer(currentServer.id)
    } catch (error) {
      logger.warn('[MCPServerDetailPanel] Failed to stop server before delete', error)
    }

    // Delete from database
    await onDelete(currentServer.id)
  }

  // Handle cancel connection
  const handleCancelConnection = async () => {
    if (!currentServer) return

    try {
      await mcpApi.cancelConnection(currentServer.id)
      logger.info('[MCPServerDetailPanel] Connection cancelled', { serverId: currentServer.id })
    } catch (error) {
      logger.warn('[MCPServerDetailPanel] Failed to cancel connection', error)
    }
  }

  // Show empty state only if no server is selected
  if (!currentServer) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Select a server from the list
          </div>
          <div className="text-xs text-muted-foreground/70">Choose an MCP server to configure</div>
        </div>
      </div>
    )
  }

  // 新建模式或 builtin 模式都不显示删除按钮
  const showDelete = !isCreating && !isBuiltin

  return (
    <>
      {/* Header */}
      <MCPServerHeader
        name={currentServer.name}
        description={currentServer.description || ''}
        avatar={currentServer.avatar}
      />

      {/* Config Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MCPServerConfigForm
          config={config}
          selectedBuilder={selectedBuilder}
          onConfigChange={setConfig}
        />

        <MCPServerStatus status={serverStatus} />
      </div>

      {/* Footer */}
      <MCPServerFooter
        status={serverStatus}
        name={(config.name as string) || currentServer.name}
        currentServer={currentServer}
        enabled={enabled}
        onSaveAndConnect={handleSaveAndConnect}
        onToggleEnabled={handleToggleEnabled}
        onDelete={showDelete ? handleDelete : undefined}
        onCancelConnection={handleCancelConnection}
      />
    </>
  )
}
