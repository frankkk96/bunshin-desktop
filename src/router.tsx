import { createBrowserRouter, Navigate, RouteObject, Outlet } from 'react-router-dom'
import { SessionsView } from '@/components/features/Sessions'
import { ContactsView } from '@/components/features/Contacts'
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

export const routes: RouteObject[] = [
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
            path: 'agents',
            element: <ContactsView />,
          },
          {
            path: 'agents/:contactId',
            element: <ContactsView />,
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
