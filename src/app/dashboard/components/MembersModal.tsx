'use client'

import { memo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { Workspace, MemberInfo } from './types'

export const MembersModal = memo(function MembersModal({ ws, currentUserId, onClose }: {
  ws: Workspace; currentUserId: string; onClose: () => void
}) {
  const t = useTranslations()
  const isOwner = ws.ownerId === currentUserId
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/workspaces/${ws.id}/members`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => { setMembers(d.members ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ws.id])

  async function invite() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setInviting(true); setInviteError('')
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? t('members.failedToInvite')); return }
      setEmail('')
      const r2 = await fetch(`/api/workspaces/${ws.id}/members`)
      if (r2.ok) {
        const d2 = await r2.json()
        setMembers(d2.members ?? [])
      }
    } catch { setInviteError(t('members.networkError')) }
    finally { setInviting(false) }
  }

  async function removeMember(userId: string) {
    setRemoving(userId)
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) setMembers(prev => prev.filter(m => m.userId !== userId))
    } finally { setRemoving(null) }
  }

  const roleBadge = (r: string) => {
    const colors: Record<string, string> = { owner: 'text-orange-400 bg-orange-900/40', editor: 'text-blue-400 bg-blue-900/40', viewer: 'text-gray-400 bg-gray-700' }
    return colors[r] ?? colors.viewer
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="members-modal-title"
        className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h3 id="members-modal-title" className="text-sm font-semibold text-white">{t('members.title')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{ws.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="text-gray-500 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-500 text-center py-4">{t('members.loading')}</p>
          ) : members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                {m.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{m.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleBadge(m.role)}`}>{m.role}</span>
              {isOwner && m.userId !== currentUserId && (
                <button type="button" onClick={() => removeMember(m.userId)} disabled={removing === m.userId}
                  aria-label={t('members.removeTitle')}
                  className="text-gray-600 hover:text-red-400 transition disabled:opacity-40 shrink-0">
                  {removing === m.userId
                    ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite form (owner only) */}
        {isOwner && (
          <div className="border-t border-gray-700 p-4 shrink-0">
            <p className="text-xs text-gray-500 font-medium mb-2">{t('members.inviteByEmail')}</p>
            <div className="flex gap-1.5">
              <label htmlFor="invite-email-input" className="sr-only">{t('members.inviteByEmail')}</label>
              <input
                id="invite-email-input"
                value={email} onChange={e => { setEmail(e.target.value); setInviteError('') }}
                onKeyDown={e => e.key === 'Enter' && invite()}
                placeholder={t('members.emailPlaceholder')}
                className={`flex-1 bg-gray-800 text-gray-200 text-xs px-2.5 py-1.5 rounded border focus:outline-none ${inviteError ? 'border-red-500' : 'border-gray-600 focus:border-orange-500'}`}
              />
              <label htmlFor="invite-role-select" className="sr-only">{t('members.roleEditor')}</label>
              <select id="invite-role-select" value={role} onChange={e => setRole(e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-orange-500">
                <option value="editor">{t('members.roleEditor')}</option>
                <option value="viewer">{t('members.roleViewer')}</option>
              </select>
              <button type="button" onClick={invite} disabled={inviting || !email.trim()}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs rounded transition">
                {inviting ? '…' : t('common.invite')}
              </button>
            </div>
            {inviteError && <p className="text-[10px] text-red-400 mt-1">{inviteError}</p>}
          </div>
        )}
      </div>
    </div>
  )
})
