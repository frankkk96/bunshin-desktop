import {
  IoChatbubbleOutline,
  IoChatbubble,
  IoPeopleOutline,
  IoPeople,
  IoSettingsOutline,
  IoSettings,
} from 'react-icons/io5'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import {
  MacOSTooltip,
  MacOSTooltipTrigger,
  MacOSTooltipContent,
  MacOSButton,
} from '@/components/ui'
import { UpdateIndicator } from '@/components/features/Updater/UpdateIndicator'

interface SidebarProps {
  activeTab: string
  onSettingsClick: () => void
}

export function Sidebar({ activeTab, onSettingsClick }: SidebarProps) {
  const { navigateToTab } = useAppNavigation()

  const tabs = [
    {
      id: 'sessions',
      label: 'Sessions',
      icon: IoChatbubble,
      outlineIcon: IoChatbubbleOutline,
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: IoPeople,
      outlineIcon: IoPeopleOutline,
    },
  ]

  return (
    <div
      data-tauri-drag-region
      className="w-[78px] h-full border-r border-border flex flex-col py-9 px-2 items-center select-none bg-secondary"
    >
      <nav data-tauri-drag-region className="flex-1 w-full flex flex-col items-center">
        {tabs.map((tab) => {
          const Icon = activeTab === tab.id ? tab.icon : tab.outlineIcon

          return (
            <MacOSTooltip key={tab.id}>
              <MacOSTooltipTrigger asChild>
                <div className="w-14 h-9 mb-2">
                  <MacOSButton
                    onClick={() => navigateToTab(tab.id)}
                    className="w-full h-full rounded-xl"
                    style={{ pointerEvents: 'auto' }}
                    variant="icon"
                  >
                    <Icon size={20} />
                  </MacOSButton>
                </div>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="right" sideOffset={8}>
                {tab.label}
              </MacOSTooltipContent>
            </MacOSTooltip>
          )
        })}
      </nav>

      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <div className="w-14 h-9 mb-2">
            <MacOSButton
              onClick={onSettingsClick}
              variant="icon"
              className="w-full h-full rounded-xl"
              style={{ pointerEvents: 'auto' }}
            >
              {activeTab === 'settings' ? (
                <IoSettings size={20} />
              ) : (
                <IoSettingsOutline size={20} />
              )}
            </MacOSButton>
          </div>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent side="right" sideOffset={8}>
          Settings
        </MacOSTooltipContent>
      </MacOSTooltip>

      <UpdateIndicator />
    </div>
  )
}
