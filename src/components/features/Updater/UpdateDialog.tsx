import { useState, useEffect } from 'react'
import { Update } from '@tauri-apps/plugin-updater'
import { MacOSSheet, MacOSSheetContent, MacOSSheetTitle, MacOSSheetDescription, MacOSButton, MacOSProgress, MacOSScrollArea } from '@/components/ui'
import { updateService, UpdateStatus } from '@/lib/core/updater/update-service'
import { Download, AlertCircle, CheckCircle, X } from 'lucide-react'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: Update | null
}

export function UpdateDialog({ open, onOpenChange, update }: UpdateDialogProps) {
  const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus())
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    const unsubscribe = updateService.onStatusChange(setStatus)
    return unsubscribe
  }, [])

  const handleInstallUpdate = async () => {
    if (!update) return

    try {
      setIsInstalling(true)
      await updateService.downloadAndInstall(update)
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!update) return null

  return (
    <MacOSSheet isOpen={open} onClose={handleClose} maxWidth="500px" height="auto">
      <MacOSSheetContent className="p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
          <div>
            <MacOSSheetTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Update Available
            </MacOSSheetTitle>
            <MacOSSheetDescription>
              Version {update.version} is now available. Would you like to update?
            </MacOSSheetDescription>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent/30 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-4 space-y-4">
          {/* Release Notes */}
          {update.body && (
            <div>
              <h4 className="font-medium mb-2 text-sm">What's New:</h4>
              <MacOSScrollArea className="h-24 w-full rounded border p-3">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {update.body}
                </div>
              </MacOSScrollArea>
            </div>
          )}

          {/* Progress Bar */}
          {status.downloading && status.progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Downloading update...</span>
                <span>{status.progress.percentage}%</span>
              </div>
              <MacOSProgress value={status.progress.percentage} className="w-full" />
              <div className="text-xs text-muted-foreground">
                {formatBytes(status.progress.downloaded)} / {formatBytes(status.progress.total)}
              </div>
            </div>
          )}

          {/* Error Display */}
          {status.error && (
            <div className="flex items-center gap-2 p-3 rounded border border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{status.error}</span>
            </div>
          )}

          {/* Success State */}
          {!status.downloading && !status.error && isInstalling && (
            <div className="flex items-center gap-2 p-3 rounded border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-300">Update installed successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/20 px-5 py-3 flex items-center justify-end gap-2">
          <MacOSButton
            variant="outline"
            onClick={handleClose}
            disabled={status.downloading}
          >
            Skip for Now
          </MacOSButton>
          <MacOSButton
            onClick={handleInstallUpdate}
            disabled={status.downloading || isInstalling}
          >
            {status.downloading ? 'Downloading...' : 'Install Update'}
          </MacOSButton>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}