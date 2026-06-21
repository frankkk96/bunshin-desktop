import { GeneralSection } from './sections/GeneralSection'

export function SettingsWindowPage() {
  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-12 relative z-10" data-tauri-drag-region />
        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="px-6 py-3 pb-6 max-w-4xl space-y-8">
            <GeneralSection />
          </div>
        </div>
      </div>
    </div>
  )
}
