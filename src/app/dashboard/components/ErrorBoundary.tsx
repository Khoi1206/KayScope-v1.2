'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

/* ══════════════════════════════════════════════════════════════
   ErrorBoundary — catches rendering errors in child tree
   and displays a recovery UI instead of a white screen.
   ══════════════════════════════════════════════════════════════ */

interface Props {
  /** Fallback UI string shown above the error message */
  label?: string
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development — replace with error reporting service in production
    console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ''}]`, error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <svg className="w-10 h-10 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-300">
              {this.props.label ? `${this.props.label} crashed` : 'Something went wrong'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm break-words">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
