import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useLocation } from 'react-router-dom'
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import { initCrashReporting } from '@/lib/core/crash-reporting/init'

async function initApp() {
  const initPromises = [{ name: 'crashReporting', promise: initCrashReporting() }]

  const results = await Promise.allSettled(initPromises.map((p) => p.promise))

  results.forEach((result, index) => {
    const initName = initPromises[index].name
    if (result.status === 'rejected') {
      console.error(`Failed to initialize ${initName}:`, result.reason)
    } else {
      console.info(`${initName} initialized successfully`)
    }
  })

  const failed = results.filter((result) => result.status === 'rejected')
  if (failed.length > 0) {
    console.warn(`${failed.length} initialization processes failed, but application will continue`)
  } else {
    console.info('All application components initialized successfully')
  }
}

function MainLayoutContent() {
  const location = useLocation()
  const activeTab = location.pathname.split('/')[1] || 'sessions'
  const initRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return
    initRef.current = true

    void initApp()
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onSettingsClick={() => openSettingsWindow('account')} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function MainLayout() {
  return <MainLayoutContent />
}
