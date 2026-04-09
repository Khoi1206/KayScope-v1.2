'use server'

import { cookies } from 'next/headers'
import { locales, type Locale } from './request'

/**
 * Persists the user's chosen locale in a cookie.
 * Called from the LocaleSwitcher client component.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!(locales as readonly string[]).includes(locale)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    httpOnly: false, // must be readable client-side if needed
  })
}
