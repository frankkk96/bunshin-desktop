import { createBrowserRouter, Navigate, RouteObject, Outlet } from 'react-router-dom'
import { ChatView } from '@/components/features/Chat'
import { ContactsView } from '@/components/features/Contacts'
import { SettingsWindowPage } from '@/components/features/Settings/SettingsWindowPage'
import { MacOSToaster } from '@/components/ui'
import { SessionProvider } from '@/components/features/Chat/SessionProvider'
import { MainLayout } from './components/layout/MainLayout'

// 根布局组件，包含全局提示
function RootLayout() {
  return (
    <>
      <Outlet />
      <MacOSToaster position="top-center" />
    </>
  )
}

// 聊天布局组件，包含 SessionProvider
function ChatLayout() {
  return (
    <SessionProvider>
      <ChatView />
    </SessionProvider>
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
            element: <Navigate to="/chats" replace />,
          },
          {
            path: 'chats/:sessionId?',
            element: <ChatLayout />,
          },
          {
            path: 'contacts',
            element: <ContactsView />,
          },
          {
            path: 'contacts/:contactId',
            element: <ContactsView />,
          },
          {
            path: '*',
            element: <Navigate to="/chats" replace />,
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
