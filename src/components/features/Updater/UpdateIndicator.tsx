import { useState, useEffect } from 'react'
import { Download, RotateCcw, CheckCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, Button } from '@/components/ui'
import { UpdateDialog } from './UpdateDialog'
import { useUpdater } from '@/components/features/Updater/useUpdater'
import { toast } from 'sonner'
import { getVersion } from '@tauri-apps/api/app'
import { arch } from '@tauri-apps/plugin-os'

export function UpdateIndicator() {
  const { updateAvailable, hasUpdate, isChecking } = useUpdater()
  const [showDialog, setShowDialog] = useState(false)
  const [hasShownNotification, setHasShownNotification] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [currentArch, setCurrentArch] = useState<string>('')

  // 获取当前版本和架构
  useEffect(() => {
    getVersion().then(setCurrentVersion)
    setCurrentArch(arch())
  }, [])

  // 主动提示用户有更新
  useEffect(() => {
    if (hasUpdate && updateAvailable && !hasShownNotification) {
      setHasShownNotification(true)

      toast.success(`Update Available: v${updateAvailable.version}`, {
        description: 'Click the update button in the sidebar to install.',
        duration: 5000,
        action: {
          label: 'Update Now',
          onClick: () => setShowDialog(true),
        },
      })
    }
  }, [hasUpdate, updateAvailable, hasShownNotification])

  // 重置通知状态当没有更新时
  useEffect(() => {
    if (!hasUpdate) {
      setHasShownNotification(false)
    }
  }, [hasUpdate])

  const handleUpdateClick = () => {
    setShowDialog(true)
  }

  if (!hasUpdate && !isChecking) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-14 h-auto mb-2">
            <Button
              onClick={() => {}} // No manual check
              className="w-full h-auto rounded-xl opacity-60 px-1 py-1.5 flex flex-col items-center gap-0.5 cursor-default"
              variant="icon"
              style={{ pointerEvents: 'none' }}
            >
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-[8px] text-green-600 font-medium leading-none">LATEST</span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          You have the latest version{currentVersion ? ` (v${currentVersion}` : ''}
          {currentArch ? `-${currentArch})` : currentVersion ? ')' : ''}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (isChecking) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-14 h-auto mb-2">
            <Button
              onClick={() => {}} // Disabled button still needs onClick
              className="w-full h-auto rounded-xl px-1 py-1.5 flex flex-col items-center gap-0.5"
              variant="icon"
              disabled
              style={{ pointerEvents: 'auto' }}
            >
              <RotateCcw size={14} className="text-muted-foreground animate-spin" />
              <span className="text-[8px] text-muted-foreground font-medium leading-none">
                CHECKING
              </span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Checking for Updates...
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-14 h-auto mb-2 relative">
            <Button
              onClick={handleUpdateClick}
              className="w-full h-auto rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-1 py-1.5 flex flex-col items-center gap-0.5"
              variant="icon"
              style={{ pointerEvents: 'auto' }}
            >
              <Download size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-[8px] text-blue-600 dark:text-blue-400 font-bold leading-none">
                v{updateAvailable?.version}
              </span>
            </Button>
            {/* Update badge */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-background flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Update Available: v{updateAvailable?.version}
        </TooltipContent>
      </Tooltip>

      <UpdateDialog open={showDialog} onOpenChange={setShowDialog} update={updateAvailable} />
    </>
  )
}
