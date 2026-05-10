import { MacOSButton } from '@/components/ui'
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import { AlertCircle } from 'lucide-react'
import { ResponseMessage, ErrorItem } from '@/lib/core/messages/types'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { logger } from '@/lib/core/utils/logger'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'

interface ErrorContentProps {
  error: ErrorItem
  message: ResponseMessage
}

export function ErrorContent({ error, message }: ErrorContentProps) {
  const navigate = useAppNavigation()
  const { retryTask } = useSessionActions(message.sessionId)

  const handleAction = async () => {
    if (!error.action) {
      return
    }
    switch (error.action) {
      case 'login':
        openSettingsWindow('providers')
        break
      case 'configure-agent':
        navigate.navigateToContact(message.agentId)
        break
      case 'retry':
        retryTask(message.queryId, message.id)
        break
      default:
        logger.error('Unknown error action:', error.action)
    }
  }

  return (
    <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm">{error.title}</h3>
          <div className="text-sm whitespace-pre-wrap">{error.message}</div>
          {error.action && (
            <div className="flex gap-2 mt-3">
              {error.action && (
                <MacOSButton size="sm" variant="destructive" onClick={handleAction}>
                  {error.label}
                </MacOSButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
