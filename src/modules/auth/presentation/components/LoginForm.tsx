'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(event.currentTarget)
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string

    const errors: Record<string, string> = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('common.invalidEmail')
    }
    if (!password) {
      errors.password = t('login.passwordRequired')
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('login.invalidCredentials'))
      } else if (result?.ok) {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0b] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      {/* Glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[128px] pointer-events-none" />

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
              Build, test &<br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{t('login.heroHighlight')}</span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              {t('login.heroDesc')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '\u26A1', title: t('login.features.http.title'), desc: t('login.features.http.desc') },
              { icon: '\uD83D\uDCC1', title: t('login.features.collections.title'), desc: t('login.features.collections.desc') },
              { icon: '\uD83C\uDF0D', title: t('login.features.environments.title'), desc: t('login.features.environments.desc') },
              { icon: '\uD83D\uDC65', title: t('login.features.workspaces.title'), desc: t('login.features.workspaces.desc') },
            ].map((f) => (
              <div key={f.title} className="bg-white/[0.04] backdrop-blur-sm rounded-xl p-4 border border-white/[0.06] hover:border-orange-500/20 transition-colors">
                <span className="text-xl mb-2 block">{f.icon}</span>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-xs">{t('common.copyright')}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-[400px]">
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
              <h1 className="text-2xl font-bold text-white mb-1">{t('login.title')}</h1>
              <p className="text-gray-500 text-sm">{t('login.subtitle')}</p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t('common.emailPlaceholder')}
                    className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 focus:bg-white/[0.06] transition-all ${
                      fieldErrors.email ? 'border-red-500/50' : 'border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

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
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 focus:bg-white/[0.06] transition-all ${
                      fieldErrors.password ? 'border-red-500/50' : 'border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#111113] mt-1"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('login.submitting')}
                  </span>
                ) : t('login.submit')}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-gray-600">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <p className="text-center text-sm text-gray-500">
              {t('login.noAccount')}{' '}
              <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                {t('login.createAccount')}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-700 mt-6 lg:hidden">{t('common.copyright')}</p>
        </div>
      </div>
    </div>
  )
}