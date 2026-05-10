import { useState, useEffect } from 'react'
import { Loader2, Mail, User, ArrowRight } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '@/contexts/AuthProvider'
import { MacOSButton, MacOSInput, MacOSAlert, MacOSAlertDescription } from '@/components/ui'
import { SettingSection } from '../components/SettingSection'
import { ProxiedImage } from '@/components/common/Images/ProxiedImage'

export function AccountSection() {
  const { user, signOut, signOutProcessing, signInWithEmail, verifyOtp, signInWithGoogle } =
    useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when user logs in successfully
  useEffect(() => {
    if (user) {
      setStep('email')
      setEmail('')
      setOtp('')
      setGoogleLoading(false)
      setError(null)
    }
  }, [user])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await signInWithEmail(email)
      if (error) {
        setError(JSON.stringify(error))
      } else {
        setStep('otp')
      }
    } catch (err) {
      setError('Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error, success } = await verifyOtp(email, otp)
      if (error) {
        setError(JSON.stringify(error))
      } else if (success) {
        // Reset form state
        setStep('email')
        setEmail('')
        setOtp('')
      }
    } catch (err) {
      setError('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setOtp('')
    setError(null)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setError(JSON.stringify(error))
      }
      // Note: Google OAuth will redirect to handle the authentication
    } catch (err) {
      setError('Failed to sign in with Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {user ? (
        <SettingSection title="Account">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {user.user_metadata?.avatar_url ? (
                  <ProxiedImage
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || user.email || 'User'}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                )}
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.full_name || 'User'}
                  </h3>
                  <span className="text-muted-foreground/40">·</span>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <MacOSButton
                onClick={signOut}
                size="sm"
                disabled={signOutProcessing}
                className="h-7 text-xs flex-shrink-0"
              >
                {signOutProcessing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  'Sign Out'
                )}
              </MacOSButton>
            </div>
          </div>
        </SettingSection>
      ) : (
        <SettingSection title="Account">
          <div className="px-4 py-3">
            {error && (
              <MacOSAlert variant="destructive" className="mb-3">
                <MacOSAlertDescription>{error}</MacOSAlertDescription>
              </MacOSAlert>
            )}

            {step === 'email' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Sign in to your account</h3>
                    <p className="text-xs text-muted-foreground">
                      Access your data across devices
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <form onSubmit={handleSendOtp} className="flex items-center gap-2">
                    <MacOSInput
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading || googleLoading}
                      className="h-8 flex-1"
                    />
                    <MacOSButton
                      type="submit"
                      className="h-8 px-3 text-xs flex-shrink-0"
                      disabled={loading || googleLoading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="ml-1.5 h-3 w-3" />
                        </>
                      )}
                    </MacOSButton>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-muted px-2 text-muted-foreground/60 text-[10px]">OR</span>
                    </div>
                  </div>

                  <MacOSButton
                    type="button"
                    className="w-full h-8 text-xs"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                  >
                    {googleLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <FcGoogle className="mr-2 h-3.5 w-3.5" />
                        Continue with Google
                      </>
                    )}
                  </MacOSButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Check your email</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Verification code sent to <span className="font-medium text-foreground">{email}</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <MacOSInput
                      id="otp"
                      type="text"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      disabled={loading}
                      maxLength={6}
                      className="text-center tracking-wider font-mono h-8 flex-1"
                    />
                    <MacOSButton type="submit" className="h-8 px-3 text-xs flex-shrink-0" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify
                          <ArrowRight className="ml-1.5 h-3 w-3" />
                        </>
                      )}
                    </MacOSButton>
                  </div>
                  <MacOSButton
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={loading}
                    className="w-full h-8 text-xs"
                  >
                    Back to email
                  </MacOSButton>
                </form>
              </div>
            )}
          </div>
        </SettingSection>
      )}
    </div>
  )
}
