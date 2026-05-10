import { useState, useEffect, useMemo } from 'react'
import { MacOSSheet, MacOSSheetContent } from '@/components/ui'
import { X } from 'lucide-react'
import type { MCPServerBuilderConfig } from '@/lib/core/extensions/mcp-servers/types'
import { MCPServerSidebar } from './MCPServerSidebar'
import { MCPServerDetailPanel } from './MCPServerDetailPanel'
import { createCustomStdioMCPServerBuilder } from '@/lib/core/extensions/mcp-servers/builder/custom-stdio'
import { createCustomHttpMCPServerBuilder } from '@/lib/core/extensions/mcp-servers/builder/custom-http'
import { logger } from '@/lib/core/utils/logger'
import { getBuiltinMCPServerBuilders } from '@/lib/core/extensions/mcp-servers/builder'

interface MCPServerListModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: string
  servers: MCPServerBuilderConfig[]
  onUpdate: (servers: MCPServerBuilderConfig[]) => void
}

// 新建服务器的临时配置
interface NewServerConfig {
  type: 'stdio' | 'http'
  config: MCPServerBuilderConfig
}

export function MCPServerListModal({
  isOpen,
  onClose,
  servers,
  onUpdate,
}: MCPServerListModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newServer, setNewServer] = useState<NewServerConfig | null>(null)
  // 缓存 builtinServers，避免每次渲染时生成新的随机 ID
  const builtinServers = useMemo(
    () => getBuiltinMCPServerBuilders().map((b) => b.initialConfig),
    [],
  )

  // 获取未配置的 builtin servers
  const getAvailableBuiltinServers = (currentServers: MCPServerBuilderConfig[]) => {
    const configuredTypes = new Set(currentServers.map((s) => s.type))
    return builtinServers.filter((s) => !configuredTypes.has(s.type))
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // 优先选中第一个已配置的服务器，否则选第一个未配置的 builtin
      const availableBuiltins = getAvailableBuiltinServers(servers)
      setSelectedId(servers[0]?.id || availableBuiltins[0]?.id || null)
      setNewServer(null)
    }
  }, [isOpen])

  // Handle save server
  const handleSave = async (server: MCPServerBuilderConfig) => {
    const existingIndex = servers.findIndex((s) => s.id === server.id)

    if (existingIndex !== -1) {
      logger.info('[MCPServerListModal] Updating existing server', { index: existingIndex })
      const updated = servers.map((s) => (s.id === server.id ? server : s))
      onUpdate(updated)
    } else {
      logger.info('[MCPServerListModal] Adding new server')
      onUpdate([...servers, server])
      // 新增服务器后选中它
      setSelectedId(server.id)
    }

    // 保存成功后清除 newServer 状态
    if (newServer) {
      setNewServer(null)
    }
  }

  // Handle delete server
  const handleDelete = async (serverId: string) => {
    logger.info('[MCPServerListModal] handleDelete called', { serverId })
    const updated = servers.filter((s) => s.id !== serverId)
    onUpdate(updated)

    // 删除后立即切换到其他服务器
    if (selectedId === serverId) {
      // 优先选择列表中的下一个，否则选第一个未配置的 builtin
      const availableBuiltins = getAvailableBuiltinServers(updated)
      setSelectedId(updated[0]?.id || availableBuiltins[0]?.id || null)
    }
  }

  // Handle add custom server - 进入新建模式
  const handleAddCustomServer = (type: 'stdio' | 'http') => {
    const builder =
      type === 'stdio' ? createCustomStdioMCPServerBuilder() : createCustomHttpMCPServerBuilder()
    setNewServer({
      type,
      config: builder.initialConfig,
    })
    setSelectedId('__new__')
  }

  // 判断当前是否在新建模式
  const isCreating = selectedId === '__new__' && newServer !== null

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="640px" height="480px">
      <MacOSSheetContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">MCP Servers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {servers.length} servers configured
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content - Split Panel */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <MCPServerSidebar
            servers={servers}
            builtinServers={builtinServers}
            selectedId={selectedId}
            isCreating={isCreating}
            onSelect={setSelectedId}
            onAddCustomServer={handleAddCustomServer}
          />

          {/* Right Panel - Configuration */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <MCPServerDetailPanel
              selectedId={selectedId}
              servers={servers}
              builtinServers={builtinServers}
              newServer={newServer?.config}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}
