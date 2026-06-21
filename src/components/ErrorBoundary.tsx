import { Component, ErrorInfo, ReactNode } from 'react'
import { CrashReporting } from '@/lib/core/crash-reporting'
import { logger } from '@/lib/core/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React error boundary caught error', { error, errorInfo })

    // 上报到错误捕获系统
    CrashReporting.captureReactError(error, {
      componentStack: errorInfo.componentStack || 'Unknown component',
    })

    // 调用外部错误处理器
    this.props.onError?.(error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
  }

  private handleReportDetails = async () => {
    try {
      const debugInfo = {
        errorId: this.state.errorId,
        error: {
          message: this.state.error?.message,
          stack: this.state.error?.stack,
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }

      console.group('🐛 Error Debug Information')
      console.log('Error ID:', this.state.errorId)
      console.log('Error:', this.state.error)
      console.log('Full Debug Info:', debugInfo)
      console.groupEnd()

      // 复制到剪贴板
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
        alert('Debug information copied to clipboard')
      }
    } catch (error) {
      console.error('Failed to get debug information:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-lg w-full mx-auto p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">Application Error</h3>

              <p className="text-sm text-muted-foreground mb-6">
                An unexpected error occurred. The error has been automatically logged.
              </p>

              {this.state.errorId && (
                <div className="mb-6 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Error ID</p>
                  <p className="text-sm font-mono">{this.state.errorId}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Try Again
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full bg-secondary text-secondary-foreground px-4 py-3 rounded-lg text-sm font-medium hover:bg-secondary/80"
                >
                  Reload Application
                </button>

                {(import.meta.env.DEV || this.state.errorId) && (
                  <button
                    onClick={this.handleReportDetails}
                    className="w-full bg-muted text-muted-foreground px-4 py-3 rounded-lg text-xs hover:bg-muted/80"
                  >
                    Copy Debug Information
                  </button>
                )}
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    Show Technical Details
                  </summary>
                  <div className="mt-3 p-4 bg-muted rounded-lg">
                    <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

