'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

/* ══════════════════════════════════════════════════════════════
   ToastContext — React Context Pattern
   
   Provides a global `showToast()` function accessible from any
   component or hook without prop drilling. Replaces the previous
   pattern of passing showToast as a callback parameter.
   ══════════════════════════════════════════════════════════════ */

export interface ToastMessage {
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toast: ToastMessage | null
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Auto-dismiss duration in ms */
const TOAST_DURATION = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = setTimeout(() => { setToast(null); timerRef.current = null }, TOAST_DURATION)
  }, [])

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      {/* ── Toast notification overlay ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

/**
 * Hook to access toast from any component inside <ToastProvider>.
 * Throws if used outside the provider (dev-time safety net).
 */
export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used inside <ToastProvider>')
  return ctx
}
