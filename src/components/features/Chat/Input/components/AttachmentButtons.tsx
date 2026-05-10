import { useCallback } from 'react'
import { IoAddOutline } from 'react-icons/io5'
import { RiSlashCommands2 } from 'react-icons/ri'
import { Menu, MenuItem } from '@tauri-apps/api/menu'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import {
  MacOSTooltip,
  MacOSTooltipTrigger,
  MacOSTooltipContent,
  MacOSButton,
} from '@/components/ui'
import { useSession } from '../../SessionProvider'
import { useInputComposerContext } from '../InputComposerProvider'

export function AttachmentButtons() {
  const { contact } = useSession()
  const { input, mention, prompt } = useInputComposerContext()

  if (!contact) {
    return null
  }

  const showMentionButton = contact.type === 'group' && contact.agents.length > 0
  const showPromptButton = contact.shortcuts && contact.shortcuts.length > 0
  const { isUploading } = input.media

  const handleShowMenu = useCallback(
    async (e: React.MouseEvent) => {
      const menuItems = []

      if (showMentionButton) {
        menuItems.push(
          await MenuItem.new({
            text: 'Mention',
            action: mention.handleMentionButtonClick,
          }),
        )
      }

      menuItems.push(
        await MenuItem.new({
          text: 'Image',
          enabled: !isUploading,
          action: input.media.handleSelectImage,
        }),
        await MenuItem.new({
          text: 'Video',
          enabled: !isUploading,
          action: input.media.handleSelectVideo,
        }),
        await MenuItem.new({
          text: 'Audio',
          enabled: !isUploading,
          action: input.media.handleSelectAudio,
        }),
        await MenuItem.new({
          text: 'PDF',
          enabled: !isUploading,
          action: input.media.handleSelectPdf,
        }),
      )

      const menu = await Menu.new({ items: menuItems })
      const position = new LogicalPosition(e.clientX, e.clientY)
      await menu.popup(position)
    },
    [showMentionButton, isUploading, mention, input.media],
  )

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1">
      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <MacOSButton
            data-tauri-drag-region
            onClick={handleShowMenu}
            variant="icon"
            className="p-1.5 rounded-md"
          >
            <IoAddOutline size={22} />
          </MacOSButton>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent>
          <p>Attachments</p>
        </MacOSTooltipContent>
      </MacOSTooltip>

      {showPromptButton && (
        <MacOSTooltip>
          <MacOSTooltipTrigger asChild>
            <MacOSButton
              data-tauri-drag-region
              onClick={prompt.handlePromptButtonClick}
              variant="icon"
              className="p-1.5 rounded-md"
            >
              <RiSlashCommands2 size={20} />
            </MacOSButton>
          </MacOSTooltipTrigger>
          <MacOSTooltipContent>
            <p>Prompts</p>
          </MacOSTooltipContent>
        </MacOSTooltip>
      )}
    </div>
  )
}
