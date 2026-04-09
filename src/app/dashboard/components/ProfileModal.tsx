'use client'

import { memo, useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'

interface ProfileData {
  id: string
  name: string
  email: string
  provider: string
  createdAt: string
}

interface ProfileModalProps {
  initialName: string
  onClose: () => void
  onNameChange: (name: string) => void
}

export const ProfileModal = memo(function ProfileModal({ initialName, onClose, onNameChange }: ProfileModalProps) {
  const t = useTranslations('profile')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  /* ── Edit name state ── */
  const [name, setName] = useState(initialName)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  /* ── Change password state ── */
  const [showPwSection, setShowPwSection] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const [isNamePending, startNameTransition] = useTransition()
  const [isPwPending, startPwTransition] = useTransition()

  /* Load profile on mount */
  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(d => {
        if (d.success) {
          setProfile(d.user)
          setName(d.user.name)
        }
      })
      .catch(() => { /* profile stays null; UI shows empty state */ })
      .finally(() => setLoading(false))
  }, [])

  function handleSaveName() {
    if (isNamePending) return
    if (name.trim().length < 2) { setNameError(t('nameMin')); return }
    startNameTransition(async () => {
      setNameError('')
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNameSaved(true)
        setProfile(prev => prev ? { ...prev, name: name.trim() } : prev)
        onNameChange(name.trim())
        setTimeout(() => setNameSaved(false), 2000)
      } else {
        setNameError(data.message ?? t('saveFailed'))
      }
    })
  }

  function handleSavePassword() {
    if (!currentPw) { setPwError(t('currentPwRequired')); return }
    if (newPw.length < 8) { setPwError(t('pwMin')); return }
    if (newPw !== confirmPw) { setPwError(t('pwMismatch')); return }
    startPwTransition(async () => {
      setPwError('')
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (data.success) {
        setPwSaved(true)
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
        setShowPwSection(false)
        setTimeout(() => setPwSaved(false), 3000)
      } else {
        setPwError(data.message ?? t('saveFailed'))
      }
    })
  }

  const isCredentials = profile?.provider === 'credentials'
  const initials = (profile?.name ?? initialName)?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-th-surface border border-th-border-soft rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-th-border-soft">
          <h2 className="text-sm font-semibold text-th-text">{t('title')}</h2>
          <button onClick={onClose} className="text-th-text-3 hover:text-th-text transition p-1 rounded hover:bg-th-input">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Avatar + meta */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-th-text truncate">{profile?.name}</p>
                  <p className="text-xs text-th-text-3 truncate">{profile?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-th-input text-th-text-3 border border-th-border-soft capitalize">
                      {profile?.provider}
                    </span>
                    {profile?.createdAt && (
                      <span className="text-[10px] text-th-text-3">
                        {t('joined')} {dayjs(profile.createdAt).format('MMM YYYY')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-th-border-soft" />

              {/* Edit name */}
              <div>
                <label className="block text-xs font-medium text-th-text-2 mb-1.5">{t('nameLabel')}</label>
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(''); setNameSaved(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="flex-1 bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500"
                    placeholder={t('namePlaceholder')}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isNamePending || name.trim() === profile?.name}
                    className={`px-3 py-2 text-xs rounded-md transition font-medium disabled:opacity-50 ${
                      nameSaved ? 'bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {isNamePending ? t('saving') : nameSaved ? t('saved') : t('save')}
                  </button>
                </div>
                {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              </div>

              {/* Read-only email */}
              <div>
                <label className="block text-xs font-medium text-th-text-2 mb-1.5">{t('emailLabel')}</label>
                <div className="bg-th-input/50 border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text-3 select-all">
                  {profile?.email}
                </div>
              </div>

              {/* Password change — credentials only */}
              {isCredentials && (
                <div>
                  <div className="border-t border-th-border-soft pt-4">
                    <button
                      onClick={() => { setShowPwSection(v => !v); setPwError('') }}
                      className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition font-medium"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${showPwSection ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {t('changePassword')}
                    </button>

                    {showPwSection && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="password"
                          value={currentPw}
                          onChange={e => { setCurrentPw(e.target.value); setPwError('') }}
                          placeholder={t('currentPw')}
                          className="w-full bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500"
                        />
                        <input
                          type="password"
                          value={newPw}
                          onChange={e => { setNewPw(e.target.value); setPwError('') }}
                          placeholder={t('newPw')}
                          className="w-full bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500"
                        />
                        <input
                          type="password"
                          value={confirmPw}
                          onChange={e => { setConfirmPw(e.target.value); setPwError('') }}
                          placeholder={t('confirmPw')}
                          className="w-full bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500"
                        />
                        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                        {pwSaved && <p className="text-xs text-green-400">{t('pwUpdated')}</p>}
                        <button
                          onClick={handleSavePassword}
                          disabled={isPwPending}
                          className="w-full py-2 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md transition font-medium disabled:opacity-50"
                        >
                          {isPwPending ? t('saving') : t('updatePassword')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
