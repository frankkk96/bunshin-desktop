// Third-party imports
import { Session, User } from '@supabase/supabase-js'
import { type Middleware } from 'openapi-fetch'
import createFetchClient from 'openapi-fetch'
import createClient, { OpenapiQueryClient } from 'openapi-react-query'

// Internal imports
import { supabase, initializeSupabase } from '@/lib/core/auth/supabase'
import { logger } from '@/lib/core/utils/logger'
import { handleAuthError, handleRuntimeError } from '@/lib/core/utils/error'
import { paths } from '@/types/api'
import { app } from '@/lib/tauri/system/app'
import { tauriEventBus } from '@/lib/tauri/system/events'
import { BASE_URL } from '@/config'

export type AuthResult = {
  error: Error | null
  success: boolean
  data?: any
}

export type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
  oauthProcessing: boolean
  oauthError: string | null
  signOutProcessing: boolean
}

export type AuthListener = (state: Partial<AuthState>) => void

class AuthService {
  private state: AuthState = {
    user: null,
    session: null,
    loading: true,
    oauthProcessing: false,
    oauthError: null,
    signOutProcessing: false,
  }

  private listeners: Set<AuthListener> = new Set()
  private isSupabaseReady = false
  private subscription: any = null
  private unlistenOAuth: (() => void) | null = null
  private initialized = false
  private fetchClient: ReturnType<typeof createFetchClient<paths>>
  private apiClient: OpenapiQueryClient<paths>

  constructor() {
    this.fetchClient = createFetchClient<paths>({
      baseUrl: BASE_URL,
    })
    this.apiClient = createClient(this.fetchClient)
  }

  // State management
  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach((listener) => listener(updates))
  }

  subscribe(listener: AuthListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): AuthState {
    return { ...this.state }
  }

  // Initialization
  async initialize(): Promise<void> {
    if (this.initialized) return

    this.setState({ loading: false })

    try {
      // Initialize Supabase
      const client = await initializeSupabase()
      this.isSupabaseReady = !!client

      if (client && supabase.auth) {
        // Get initial session
        const {
          data: { session },
        } = await supabase.auth.getSession()
        this.setState({
          session,
          user: session?.user ?? null,
        })

        // Set up auth state listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          this.setState({
            session,
            user: session?.user ?? null,
          })
        })
        this.subscription = subscription

        // Set up OAuth listener
        await this.setupOAuthListener()
      } else {
        logger.info('Supabase not configured, auth features disabled')
      }

      this.initialized = true
    } catch (error) {
      handleAuthError(error, { message: 'Error during initialization', silent: true })
      this.isSupabaseReady = false
    }
  }

  // OAuth deeplink listener（需要真正的跨进程通信，从 Rust 后端接收 OAuth 回调）
  private async setupOAuthListener(): Promise<void> {
    this.unlistenOAuth = await tauriEventBus.listen<string>('oauth-callback', async (event) => {
      const url = event.payload
      logger.info('OAuth callback received', { url })

      this.setState({
        oauthProcessing: true,
        oauthError: null,
      })

      try {
        await this.processOAuthCallback(url)
      } catch (error) {
        handleAuthError(error, { message: 'OAuth callback processing error' })
        this.setState({
          oauthError: 'Failed to process OAuth deeplink callback',
          oauthProcessing: false,
        })
      }
    })
  }

  private async processOAuthCallback(url: string): Promise<void> {
    // Extract OAuth parameters from the deeplink URL
    const urlObj = new URL(url)

    // OAuth parameters can be in either query string OR hash fragment
    let params: URLSearchParams
    if (urlObj.hash && urlObj.hash.length > 1) {
      // Hash-based parameters (Google implicit flow)
      params = new URLSearchParams(urlObj.hash.substring(1))
    } else {
      // Query string parameters (authorization code flow)
      params = new URLSearchParams(urlObj.search)
    }

    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const code = params.get('code')
    const error = params.get('error')
    const error_description = params.get('error_description')

    if (error) {
      const errorMessage = error_description || error
      handleAuthError(new Error(errorMessage), { message: 'OAuth error', silent: true })
      this.setState({
        oauthError: errorMessage,
        oauthProcessing: false,
      })
      return
    }

    if (!supabase?.auth) {
      this.setState({
        oauthError: 'Supabase not configured',
        oauthProcessing: false,
      })
      return
    }

    // Try different OAuth flows
    if (access_token && refresh_token) {
      await this.handleTokenBasedAuth(access_token, refresh_token)
    } else if (access_token && !refresh_token) {
      await this.handleAccessTokenOnlyAuth(access_token)
    } else if (code) {
      await this.handleCodeBasedAuth(code)
    } else {
      const errorMessage = 'Missing tokens and code in OAuth deeplink callback'
      handleAuthError(new Error(errorMessage), { silent: true })
      this.setState({
        oauthError: errorMessage,
        oauthProcessing: false,
      })
    }
  }

  private async handleTokenBasedAuth(access_token: string, refresh_token: string): Promise<void> {
    const { data, error } = await supabase.auth!.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      handleAuthError(error, { message: 'Failed to set OAuth session', silent: true })
      this.setState({
        oauthError: error.message,
        oauthProcessing: false,
      })
      return
    }

    if (data.session) {
      logger.info('OAuth login successful', { user: data.session.user })
      this.setState({
        session: data.session,
        user: data.session.user,
        oauthProcessing: false,
        oauthError: null,
      })
    }
  }

  private async handleAccessTokenOnlyAuth(access_token: string): Promise<void> {
    try {
      const { data: userData, error: userError } = await supabase.auth!.getUser(access_token)

      if (userError) {
        handleAuthError(userError, { message: 'Failed to get OAuth user', silent: true })
      } else if (userData.user) {
        // Create a minimal session object
        const session = {
          access_token,
          refresh_token: '',
          expires_in: 3600,
          expires_at: Date.now() + 3600 * 1000,
          token_type: 'bearer',
          user: userData.user,
        }
        this.setState({
          session: session as any,
          user: userData.user,
          oauthProcessing: false,
          oauthError: null,
        })
      }
    } catch (error) {
      handleAuthError(error, { message: 'OAuth access token error', silent: true })
      this.setState({
        oauthError: 'Failed to authenticate with access token',
        oauthProcessing: false,
      })
    }
  }

  private async handleCodeBasedAuth(code: string): Promise<void> {
    const { data, error } = await supabase.auth!.exchangeCodeForSession(code)

    if (error) {
      handleAuthError(error, { message: 'Failed to set session with tokens', silent: true })
      this.setState({
        oauthError: error.message,
        oauthProcessing: false,
      })
      return
    }

    if (data.session) {
      logger.info('OAuth login successful', { user: data.session.user })
      this.setState({
        session: data.session,
        user: data.session.user,
        oauthProcessing: false,
        oauthError: null,
      })
    }
  }

  // Authentication methods
  async signInWithEmail(email: string): Promise<AuthResult> {
    if (!this.isSupabaseReady || !supabase.auth) {
      return { error: new Error('Supabase not configured'), success: false }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      return { error, success: !error }
    } catch (error) {
      return { error: error as Error, success: false }
    }
  }

  async verifyOtp(email: string, token: string): Promise<AuthResult> {
    if (!this.isSupabaseReady || !supabase.auth) {
      return { error: new Error('Supabase not configured'), success: false, data: null }
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      return { error, success: !error, data }
    } catch (error) {
      return { error: error as Error, success: false, data: null }
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    if (!this.isSupabaseReady || !supabase.auth) {
      return { error: new Error('Supabase not configured'), success: false }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'bunshin://oauth-callback',
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        return { error, success: false }
      }

      if (data?.url) {
        await app.openUrl(data.url)
        return { error: null, success: true }
      }

      return { error: new Error('Failed to get OAuth URL'), success: false }
    } catch (error) {
      return { error: error as Error, success: false }
    }
  }

  async signOut(): Promise<void> {
    if (!this.isSupabaseReady || !supabase.auth) return

    this.setState({ signOutProcessing: true })
    try {
      await supabase.auth.signOut()
    } catch (error) {
      handleRuntimeError(error, { message: 'Operation failed' })
    } finally {
      this.setState({ signOutProcessing: false })
    }
  }

  async requireAuth(): Promise<boolean> {
    // If user already exists, return true directly
    if (this.state.user) {
      return true
    }

    // Check if there's a valid session
    if (!this.isSupabaseReady || !supabase.auth) {
      return false
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        this.setState({
          session,
          user: session.user,
        })
        return true
      }
    } catch (error) {
      handleRuntimeError(error, { message: 'Operation failed' })
    }

    return false
  }

  // API utilities
  get authMiddleware(): Middleware {
    const self = this
    return {
      async onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${self.state.session?.access_token}`)
        return request
      },
    }
  }

  get apis(): OpenapiQueryClient<paths> {
    return this.apiClient
  }

  get baseUrl(): string {
    return BASE_URL
  }

  // Cleanup
  destroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
    if (this.unlistenOAuth) {
      this.unlistenOAuth()
    }
    this.listeners.clear()
    this.initialized = false
  }
}

// Export singleton instance
export const authService = new AuthService()
