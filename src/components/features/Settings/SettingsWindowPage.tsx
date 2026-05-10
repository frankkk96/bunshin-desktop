import { AccountSection } from './sections/AccountSection'
import { GeneralSection } from './sections/GeneralSection'

export function SettingsWindowPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Drag region */}
        <div className="h-12 relative z-10" data-tauri-drag-region />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="px-6 py-3 pb-6 max-w-4xl space-y-8">
            {/* Account section first */}
            <AccountSection />

            {/* General section second */}
            <GeneralSection />
          </div>
        </div>
      </div>
    </div>
  )
}
