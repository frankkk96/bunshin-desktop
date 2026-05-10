import {
  IoChatbubbleOutline,
  IoPeopleOutline,
  IoChatbubble,
  IoPeople,
  IoPersonCircleOutline,
  IoPersonCircle,
} from 'react-icons/io5'
import { MessageSquare, Bug } from 'lucide-react'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import {
  MacOSTooltip,
  MacOSTooltipTrigger,
  MacOSTooltipContent,
  MacOSButton,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthProvider'
import { UpdateIndicator } from '@/components/features/Updater/UpdateIndicator'
import { openUrl } from '@tauri-apps/plugin-opener'
import { testCrashAndSubmit } from '@/lib/core/utils/crash'
import { useState } from 'react'
import { toast } from '@/lib/core/utils/toast'
import { ProxiedImage } from '@/components/common/Images/ProxiedImage'

interface SidebarProps {
  activeTab: string
  onSettingsClick: () => void
}

export function Sidebar({ activeTab, onSettingsClick }: SidebarProps) {
  const { navigateToTab } = useAppNavigation()
  const { user } = useAuth()
  const [isTestingCrash, setIsTestingCrash] = useState(false)

  const handleFeedbackClick = async () => {
    try {
      await openUrl('https://github.com/frankkk96/Bunshin-Release/issues')
    } catch (error) {
      console.error('Failed to open feedback URL:', error)
    }
  }

  const handleTestCrashClick = async () => {
    try {
      setIsTestingCrash(true)
      toast.info('Triggering test crash and reading logs...')

      // 触发测试崩溃并读取日志
      // 在开发环境中，不提交到后端，只在控制台显示
      // 如果要提交到真实后端，传入 endpoint 参数
      await testCrashAndSubmit('https://server.bunshin.app/telemetry/crash-reports')

      toast.success('Crash report submitted successfully!')
    } catch (error) {
      console.error('Test crash failed:', error)
      toast.error('Test failed: ' + (error as Error).message)
    } finally {
      setIsTestingCrash(false)
    }
  }

  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      icon: IoChatbubble,
      outlineIcon: IoChatbubbleOutline,
    },
    {
      id: 'contacts',
      label: 'Contacts',
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

      {/* User Avatar / Settings */}
      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <div className="w-14 h-9 mb-2">
            <MacOSButton
              onClick={onSettingsClick}
              variant="icon"
              className="w-full h-full rounded-xl"
              style={{ pointerEvents: 'auto' }}
            >
              {user ? (
                user.user_metadata?.avatar_url ? (
                  <ProxiedImage
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || user.email || 'User'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : activeTab === 'settings' ? (
                  <IoPersonCircle size={20} />
                ) : (
                  <IoPersonCircleOutline size={20} />
                )
              ) : (
                <IoPersonCircleOutline size={20} className="text-muted-foreground" />
              )}
            </MacOSButton>
          </div>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent side="right" sideOffset={8}>
          {user ? 'Profile & Settings' : 'Login'}
        </MacOSTooltipContent>
      </MacOSTooltip>

      {/* Update Indicator */}
      <UpdateIndicator />

      {/* Feedback Button */}
      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <div className="w-14 h-9 mb-2">
            <MacOSButton
              onClick={handleFeedbackClick}
              className="w-full h-full rounded-xl"
              style={{ pointerEvents: 'auto' }}
              variant="icon"
            >
              <MessageSquare size={20} />
            </MacOSButton>
          </div>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent side="right" sideOffset={8}>
          Submit Feedback
        </MacOSTooltipContent>
      </MacOSTooltip>

      {/* Test Crash Button - Only in Development */}
      {import.meta.env.DEV && (
        <MacOSTooltip>
          <MacOSTooltipTrigger asChild>
            <div className="w-14 h-9 mb-2">
              <MacOSButton
                onClick={handleTestCrashClick}
                disabled={isTestingCrash}
                className="w-full h-full rounded-xl"
                style={{ pointerEvents: 'auto' }}
                variant="icon"
              >
                <Bug size={20} className={isTestingCrash ? 'animate-pulse' : ''} />
              </MacOSButton>
            </div>
          </MacOSTooltipTrigger>
          <MacOSTooltipContent side="right" sideOffset={8}>
            {isTestingCrash ? 'Testing...' : 'Test Crash & Logs'}
          </MacOSTooltipContent>
        </MacOSTooltip>
      )}
    </div>
  )
}
