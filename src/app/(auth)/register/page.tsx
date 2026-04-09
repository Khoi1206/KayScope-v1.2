import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { RegisterForm } from '@/modules/auth/presentation/components/RegisterForm'

/**
 * Register page — Server Component.
 * Redirects to dashboard if already authenticated.
 */
export default async function RegisterPage() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return <RegisterForm />
}
