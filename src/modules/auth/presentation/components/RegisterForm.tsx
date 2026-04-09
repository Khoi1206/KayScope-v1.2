'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { registerAction, type ActionState } from '../actions/auth.actions'

const initialState: ActionState = { success: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('register')
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#111113] mt-1"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('submitting')}
        </span>
      ) : t('submit')}
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  )
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialState)
  const router = useRouter()
  const t = useTranslations()

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => router.push('/login'), 1800)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  const inputClass = (hasError?: boolean) =>
    `w-full pl-10 pr-4 py-3 bg-white/[0.04] border rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 focus:bg-white/[0.06] transition-all ${
      hasError ? 'border-red-500/50' : 'border-white/[0.08] hover:border-white/[0.15]'
    }`

  return (
    <div className="min-h-screen flex bg-[#0a0a0b] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      {/* Glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-12 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">KayScope</span>
        </div>

        <div className="space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Your team&apos;s API<br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{t('register.heroHighlight')}</span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              {t('register.heroDesc')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: t('register.features.free.value'), label: t('register.features.free.label'), icon: '\u2728' },
              { value: t('register.features.real.value'), label: t('register.features.real.label'), icon: '\u26A1' },
              { value: t('register.features.vars.value'), label: t('register.features.vars.label'), icon: '\uD83C\uDF0D' },
              { value: t('register.features.team.value'), label: t('register.features.team.label'), icon: '\uD83D\uDC65' },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.04] backdrop-blur-sm rounded-xl p-4 border border-white/[0.06] hover:border-orange-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <p className="text-orange-400 font-bold text-sm font-mono">{s.value}</p>
                </div>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-xs">{t('common.copyright')}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/40">
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">KayScope</span>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1">{t('register.title')}</h1>
              <p className="text-gray-500 text-sm">{t('register.subtitle')}</p>
            </div>

            {/* Success banner */}
            {state.success && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-400 text-sm">{state.message ?? t('register.success')}</p>
              </div>
            )}

            {/* Error banner */}
            {state.message && !state.success && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{state.message}</p>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {/* Full name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('register.nameLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="name" name="name" type="text" autoComplete="name" required
                    placeholder={t('register.namePlaceholder')}
                    className={inputClass(!!state.fields?.name)}
                  />
                </div>
                <FieldError message={state.fields?.name} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('common.emailLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    placeholder={t('common.emailPlaceholder')}
                    className={inputClass(!!state.fields?.email)}
                  />
                </div>
                <FieldError message={state.fields?.email} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('common.passwordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password" name="password" type="password" autoComplete="new-password" required
                    placeholder={t('register.passwordPlaceholder')}
                    className={inputClass(!!state.fields?.password)}
                  />
                </div>
                <FieldError message={state.fields?.password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('register.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    className={inputClass(!!state.fields?.confirmPassword)}
                  />
                </div>
                <FieldError message={state.fields?.confirmPassword} />
              </div>

              <SubmitButton />
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-gray-600">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <p className="text-center text-sm text-gray-500">
              {t('register.hasAccount')}{' '}
              <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                {t('register.signIn')}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-700 mt-6 lg:hidden">{t('common.copyright')}</p>
        </div>
      </div>
    </div>
  )
}