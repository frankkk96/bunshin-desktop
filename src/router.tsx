import { createBrowserRouter, Navigate, RouteObject, Outlet } from 'react-router-dom'
import { SessionsView } from '@/components/features/Sessions'
import { SettingsWindowPage } from '@/components/features/Settings/SettingsWindowPage'
import { MacOSToaster } from '@/components/ui'
import { MainLayout } from './components/layout/MainLayout'

function RootLayout() {
  return (
    <>
      <Outlet />
      <MacOSToaster position="top-center" />
    </>
  )
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/sessions" replace />,
          },
          {
            path: 'sessions/:sessionId?',
            element: <SessionsView />,
          },
          {
            // Agents now live in Settings → Agents; keep old links working.
            path: 'agents/*',
            element: <Navigate to="/sessions" replace />,
          },
          {
            path: '*',
            element: <Navigate to="/sessions" replace />,
          },
        ],
      },
      {
        path: 'settings-window',
        element: <SettingsWindowPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
