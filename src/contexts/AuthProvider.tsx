// React imports
import { createContext, useContext } from 'react'

// Third-party imports
import { Session, User } from '@supabase/supabase-js'
import { type Middleware } from 'openapi-fetch'
import { OpenapiQueryClient } from 'openapi-react-query'

// Internal imports
import { paths } from '@/types/api'
import { useAuth as useAuthHook } from '@/hooks/useAuth'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  // OAuth processing state
  oauthProcessing: boolean
  oauthError: string | null
  // Sign out processing state
  signOutProcessing: boolean
  // Email OTP login
  signInWithEmail: (email: string) => Promise<{
    error: Error | null
    success: boolean
  }>
  verifyOtp: (
    email: string,
    token: string,
  ) => Promise<{
    error: Error | null
    success: boolean
    data?: any
  }>
  // Google OAuth login
  signInWithGoogle: () => Promise<{
    error: Error | null
    success: boolean
  }>
  signOut: () => Promise<void>
  // Authentication check method when auth is required
  requireAuth: () => Promise<boolean>
  authMiddleware: Middleware
  baseUrl: string
  apis: OpenapiQueryClient<paths>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authData = useAuthHook()

  return <AuthContext.Provider value={authData}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }
  return context
}
