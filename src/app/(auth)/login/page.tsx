import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { LoginForm } from '@/modules/auth/presentation/components/LoginForm'

/**
 * Login page — Server Component.
 * Redirects to dashboard if already authenticated.
 */
export default async function LoginPage() {
  const session = await auth()

  // Already authenticated → redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
