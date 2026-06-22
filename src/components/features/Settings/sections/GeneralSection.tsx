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
import { cn } from '@/lib/ui/utils'
import { useT } from '@/lib/i18n'
import { SettingSelect } from '../components/SettingSelect'
import { SettingSection } from '../components/SettingSection'
import { SettingRow } from '../components/SettingRow'
import { SettingDivider } from '../components/SettingDivider'

export function GeneralSection() {
  const t = useT()
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

  const handleFeedbackClick = async () => {
    try {
      await openUrl('https://github.com/frankkk96/bunshin-desktop/issues')
    } catch (error) {
      console.error('Failed to open feedback URL:', error)
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
        return t('set.test')
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
      <SettingSection title={t('set.application')}>
        <SettingRow icon={<Palette className="w-4 h-4" />} title={t('set.theme')}>
          <SettingSelect
            value={theme}
            onValueChange={(value) => {
              updateSettings.mutate({ theme: value as Theme })
            }}
            options={[
              { value: 'light', label: t('set.light') },
              { value: 'dark', label: t('set.dark') },
              { value: 'system', label: t('set.systemMode') },
            ]}
            className="text-sm"
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow icon={<Globe className="w-4 h-4" />} title={t('set.language')}>
          <SettingSelect
            value={language}
            onValueChange={(value) => {
              updateSettings.mutate({ language: value })
            }}
            options={[
              { value: 'en', label: 'English' },
              { value: 'zh', label: '中文' },
            ]}
            className="text-sm"
          />
        </SettingRow>
      </SettingSection>

      {/* System */}
      <SettingSection title={t('set.system')}>
        <SettingRow icon={<RefreshCw className="w-4 h-4" />} title={t('set.autoUpdate')}>
          <Switch
            checked={autoUpdate}
            onCheckedChange={(checked: boolean) => {
              updateSettings.mutate({ autoUpdate: checked })
            }}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow icon={<Bug className="w-4 h-4" />} title={t('set.crashReports')}>
          <Switch
            checked={crashReports}
            onCheckedChange={(checked: boolean) => {
              updateSettings.mutate({ crashReports: checked })
            }}
          />
        </SettingRow>
      </SettingSection>

      {/* Proxy Configuration */}
      <SettingSection title={t('set.proxy')}>
        <SettingRow
          icon={<Router className="w-4 h-4" />}
          title={t('set.proxyUrl')}
          description={t('set.proxyDesc')}
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
      <SettingSection title={t('set.dataMgmt')}>
        <SettingRow
          icon={<Download className="w-4 h-4" />}
          title={t('set.exportData')}
          description={t('set.exportDesc')}
        >
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t('cfg.saving')}
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {t('set.export')}
              </>
            )}
          </Button>
        </SettingRow>
      </SettingSection>

      {/* Help & Diagnostics */}
      <SettingSection title={t('set.help')}>
        <SettingRow
          icon={<MessageSquare className="w-4 h-4" />}
          title={t('set.feedback')}
          description={t('set.feedbackDesc')}
        >
          <Button onClick={handleFeedbackClick} variant="outline">
            {t('set.open')}
          </Button>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
