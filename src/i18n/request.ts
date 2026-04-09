import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export const locales = ['en', 'vi'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async () => {
  // 1. Explicit cookie set by the user's language switcher
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value

  // 2. Browser's Accept-Language header (first match)
  const headerStore = await headers()
  const acceptLang = headerStore.get('accept-language') ?? ''
  const browserLocale = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase()

  const preferred = cookieLocale ?? browserLocale ?? defaultLocale
  const locale = (locales as readonly string[]).includes(preferred)
    ? (preferred as Locale)
    : defaultLocale

  const messages = await {
    en: () => import('../../messages/en.json'),
    vi: () => import('../../messages/vi.json'),
  }[locale]()

  return {
    locale,
    messages: messages.default,
  }
})
