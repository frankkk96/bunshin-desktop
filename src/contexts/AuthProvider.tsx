import { createContext, useContext } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useAuth as useAuthHook } from '@/hooks/useAuth'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  oauthProcessing: boolean
  oauthError: string | null
  signOutProcessing: boolean
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
  signInWithGoogle: () => Promise<{
    error: Error | null
    success: boolean
  }>
  signOut: () => Promise<void>
  requireAuth: () => Promise<boolean>
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
