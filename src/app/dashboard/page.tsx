import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/ToastContext'

/**
 * Dashboard — Server Component.
 * Validates session server-side then renders the full client-side app shell.
 */
export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <ToastProvider>
      <AppShell
        userName={session.user.name ?? 'User'}
        userEmail={session.user.email ?? ''}
        userId={session.user.id ?? ''}
      />
    </ToastProvider>
  )
}
