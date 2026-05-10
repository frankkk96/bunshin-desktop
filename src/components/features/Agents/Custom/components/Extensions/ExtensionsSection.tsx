import { useState } from 'react'
import { SettingDivider } from '@/components/features/Settings/components/SettingDivider'
import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import { SettingModal } from '@/components/features/Settings/components/SettingModal'
import { MacOSSwitch } from '@/components/ui/macos/macos-switch'
import { Agent } from '@/lib/core/agent/types'
import { Server, Shield, Puzzle } from 'lucide-react'
import { MCPServerBuilderConfig } from '@/lib/core/extensions/mcp-servers/types'
import { logger } from '@/lib/core/utils/logger'
import { MCPServerListModal } from './MCPServers'

export function ExtensionsSection({
  agent,
  onUpdate,
}: {
  agent: Agent
  onUpdate: (updates: Partial<Agent>) => void
}) {
  const [extensionModalOpen, setExtensionModalOpen] = useState(false)

  const extensions = agent.extension.mcpServers || []
  const extensionCount = extensions.length

  const handleExtensionsUpdate = (mcpServers: MCPServerBuilderConfig[]) => {
    logger.info('[ExtensionsSection] onUpdate called', { mcpServers })
    onUpdate({
      extension: { ...agent.extension, mcpServers },
    })
  }

  return (
    <>
      <SettingSection title="Extensions" icon={Server}>
        <SettingRow
          icon={<Shield className="w-4 h-4" />}
          title="Skip Permission"
          description="Skip tool call permission approval"
        >
          <MacOSSwitch
            checked={agent.extension.skipPermission || false}
            onCheckedChange={(skipPermission) =>
              onUpdate({
                extension: { ...agent.extension, skipPermission },
              })
            }
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow
          icon={<Puzzle className="w-4 h-4" />}
          title="MCP Servers"
          description={
            extensionCount > 0
              ? `${extensionCount} server${extensionCount > 1 ? 's' : ''} configured`
              : 'No servers configured'
          }
        >
          <SettingModal
            label={
              extensionCount > 0
                ? `${extensionCount} server${extensionCount > 1 ? 's' : ''}`
                : 'Configure'
            }
            onClick={() => setExtensionModalOpen(true)}
          />
        </SettingRow>
      </SettingSection>

      <MCPServerListModal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        agentId={agent.id}
        servers={extensions}
        onUpdate={handleExtensionsUpdate}
      />
    </>
  )
}
