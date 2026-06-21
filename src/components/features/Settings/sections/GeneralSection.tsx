import { useState } from 'react'
import {
  Globe,
  RefreshCw,
  Palette,
  Router,
  Check,
  X,
  Loader2,
  Download,
  Bug,
  MessageSquare,
} from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Switch,
  Input,
  Button,
  Alert,
  AlertDescription,
} from '@/components/ui'
import { Theme, useAppSettingsQuery } from '@/hooks/settings/query'
import { useSettingsMutations, useSettingsChangeListener } from '@/hooks/settings/mutations'
import { useProxy } from '@/components/features/Settings/hooks/useProxy'
import { app } from '@/lib/tauri/system/app'
import { testCrashAndSubmit } from '@/lib/core/utils/crash'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import { SettingSelect } from '../components/SettingSelect'
import { SettingSection } from '../components/SettingSection'
import { SettingRow } from '../components/SettingRow'
import { SettingDivider } from '../components/SettingDivider'

export function GeneralSection() {
  // Listen for settings changes from other windows
  useSettingsChangeListener()

  // Query and mutations
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useAppSettingsQuery()
  const { updateSettings } = useSettingsMutations()

  // Extract settings values with defaults
  const theme = settings?.theme || 'system'
  const language = settings?.language || 'en'
  const autoUpdate = settings?.autoUpdate ?? true
  const crashReports = settings?.crashReports ?? true

  const { proxyUrl, testStatus, handleProxyUrlChange, handleTestProxy } = useProxy()

  // Privacy & Data states
  const [isExporting, setIsExporting] = useState(false)
  const [dataManagementError, setDataManagementError] = useState<string | null>(null)
  const [dataManagementSuccess, setDataManagementSuccess] = useState<string | null>(null)
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
      await testCrashAndSubmit('https://server.bunshin.app/telemetry/crash-reports')
      toast.success('Crash report submitted successfully!')
    } catch (error) {
      console.error('Test crash failed:', error)
      toast.error('Test failed: ' + (error as Error).message)
    } finally {
      setIsTestingCrash(false)
    }
  }

  // Get test button content based on status
  const getTestButtonContent = () => {
    switch (testStatus) {
      case 'testing':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing...
          </>
        )
      case 'success':
        return (
          <>
            <Check className="w-4 h-4" />
            Connected
          </>
        )
      case 'error':
        return (
          <>
            <X className="w-4 h-4" />
            Failed
          </>
        )
      default:
        return 'Test'
    }
  }

  // Update proxy settings when proxy URL changes
  const handleProxyUrlUpdate = async (url: string) => {
    handleProxyUrlChange(url)
    updateSettings.mutate({
      proxy: {
        enabled: !!url.trim(),
        url: url.trim(),
      },
    })
  }

  // Privacy & Data functions
  const handleExportData = async () => {
    setIsExporting(true)
    setDataManagementError(null)
    setDataManagementSuccess(null)

    try {
      const exportData = await app.exportAllData()
      if (!exportData) {
        setDataManagementError('Failed to prepare export data')
        return
      }

      const filename = `bunshin-data-export-${new Date().toISOString().split('T')[0]}.json`
      const saved = await app.saveExportData(exportData, filename)

      if (saved) {
        setDataManagementSuccess('Data exported successfully')
      } else {
        setDataManagementSuccess('Export cancelled by user')
      }
    } catch (error) {
      setDataManagementError('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {(settingsError || dataManagementError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {settingsError ? String(settingsError) : dataManagementError}
          </AlertDescription>
        </Alert>
      )}

      {dataManagementSuccess && (
        <Alert>
          <AlertDescription>{dataManagementSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Application */}
      <SettingSection title="Application">
        <SettingRow icon={<Palette className="w-4 h-4" />} title="Theme">
          <SettingSelect
            value={theme}
            onValueChange={(value) => {
              updateSettings.mutate({ theme: value as Theme })
            }}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
            className="text-sm"
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow icon={<Globe className="w-4 h-4" />} title="Language">
          <SettingSelect
            value={language}
            onValueChange={(value) => {
              updateSettings.mutate({ language: value })
            }}
            options={[
              { value: 'en', label: 'English' },
              // { value: 'zh', label: '中文' },
              // { value: 'ja', label: '日本語' },
              // { value: 'ko', label: '한국어' },
            ]}
            className="text-sm"
          />
        </SettingRow>
      </SettingSection>

      {/* System */}
      <SettingSection title="System">
        <SettingRow icon={<RefreshCw className="w-4 h-4" />} title="Auto Update">
          <Switch
            checked={autoUpdate}
            onCheckedChange={(checked: boolean) => {
              updateSettings.mutate({ autoUpdate: checked })
            }}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow icon={<Bug className="w-4 h-4" />} title="Crash Reports">
          <Switch
            checked={crashReports}
            onCheckedChange={(checked: boolean) => {
              updateSettings.mutate({ crashReports: checked })
            }}
          />
        </SettingRow>
      </SettingSection>

      {/* Proxy Configuration */}
      <SettingSection title="Proxy">
        <SettingRow
          icon={<Router className="w-4 h-4" />}
          title="Proxy URL"
          description="HTTP/HTTPS proxy server URL"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={proxyUrl}
              onChange={(e) => handleProxyUrlUpdate(e.target.value)}
              placeholder="http://127.0.0.1:7890"
              className="flex-1"
            />
            <Button
              onClick={handleTestProxy}
              disabled={testStatus === 'testing' || !proxyUrl.trim()}
              variant="outline"
              className={cn(
                'flex items-center gap-1.5',
                testStatus === 'success' &&
                  'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
                testStatus === 'error' && 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
              )}
            >
              {getTestButtonContent()}
            </Button>
          </div>
        </SettingRow>
      </SettingSection>

      {/* Data Management */}
      <SettingSection title="Data Management">
        <SettingRow
          icon={<Download className="w-4 h-4" />}
          title="Export Data"
          description="Export all application data excluding encrypted API keys"
        >
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </>
            )}
          </Button>
        </SettingRow>
      </SettingSection>

      {/* Help & Diagnostics */}
      <SettingSection title="Help & Diagnostics">
        <SettingRow
          icon={<MessageSquare className="w-4 h-4" />}
          title="Submit Feedback"
          description="Open the GitHub issue tracker"
        >
          <Button onClick={handleFeedbackClick} variant="outline">
            Open
          </Button>
        </SettingRow>

        {import.meta.env.DEV && (
          <>
            <SettingDivider />
            <SettingRow
              icon={<Bug className="w-4 h-4" />}
              title="Test Crash & Logs"
              description="Triggers a test crash report (dev only)"
            >
              <Button
                onClick={handleTestCrashClick}
                disabled={isTestingCrash}
                variant="outline"
              >
                {isTestingCrash ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Testing…
                  </>
                ) : (
                  <>
                    <Bug className="w-3.5 h-3.5 mr-1.5" />
                    Trigger
                  </>
                )}
              </Button>
            </SettingRow>
          </>
        )}
      </SettingSection>
    </div>
  )
}
