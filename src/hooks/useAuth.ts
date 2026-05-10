import { useEffect, useState } from 'react'
import { authService, AuthState, AuthResult } from '@/lib/core/auth/auth-service'

export function useAuth() {
  const [state, setState] = useState<AuthState>(authService.getState())

  useEffect(() => {
    // Initialize auth service
    authService.initialize()

    // Subscribe to state changes
    const unsubscribe = authService.subscribe((updates) => {
      setState(current => ({ ...current, ...updates }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Authentication methods
  const signInWithEmail = async (email: string): Promise<AuthResult> => {
    return authService.signInWithEmail(email)
  }

  const verifyOtp = async (email: string, token: string): Promise<AuthResult> => {
    return authService.verifyOtp(email, token)
  }

  const signInWithGoogle = async (): Promise<AuthResult> => {
    return authService.signInWithGoogle()
  }

  const signOut = async (): Promise<void> => {
    return authService.signOut()
  }

  const requireAuth = async (): Promise<boolean> => {
    return authService.requireAuth()
  }

  return {
    // State
    user: state.user,
    session: state.session,
    loading: state.loading,
    oauthProcessing: state.oauthProcessing,
    oauthError: state.oauthError,
    signOutProcessing: state.signOutProcessing,

    // Methods
    signInWithEmail,
    verifyOtp,
    signInWithGoogle,
    signOut,
    requireAuth,
  }
}