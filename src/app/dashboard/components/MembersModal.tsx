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
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [roleUpdateError, setRoleUpdateError] = useState('')

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
    setInviting(true); setInviteError(''); setInviteSuccess(false)
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? t('members.failedToInvite')); return }
      setEmail(''); setInviteSuccess(true)
      const r2 = await fetch(`/api/workspaces/${ws.id}/members`)
      if (r2.ok) { const d2 = await r2.json(); setMembers(d2.members ?? []) }
    } catch { setInviteError(t('members.networkError')) }
    finally { setInviting(false) }
  }

  async function removeMember(userId: string) {
    setRemoving(userId); setRemoveError('')
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.userId !== userId))
      } else {
        const data = await res.json()
        setRemoveError(data.error ?? t('members.failedToRemove'))
      }
    } catch { setRemoveError(t('members.networkError')) }
    finally { setRemoving(null) }
  }

  async function changeRole(userId: string, newRole: string) {
    setUpdatingRole(userId); setRoleUpdateError('')
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m))
      } else {
        const data = await res.json()
        setRoleUpdateError(data.error ?? t('members.failedToUpdate'))
      }
    } catch { setRoleUpdateError(t('members.networkError')) }
    finally { setUpdatingRole(null) }
  }

  const roleLabel = (r: string) => {
    if (r === 'owner') return t('members.roleOwner')
    if (r === 'editor') return t('members.roleEditor')
    return t('members.roleViewer')
  }

  const roleBadgeColors: Record<string, string> = {
    owner: 'text-orange-400 bg-orange-900/40',
    editor: 'text-blue-400 bg-blue-900/40',
    viewer: 'text-gray-400 bg-gray-700',
  }
  const roleBadge = (r: string) => roleBadgeColors[r] ?? roleBadgeColors.viewer

  const formatDate = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

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
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-700 rounded w-1/3" />
                    <div className="h-2 bg-gray-700/60 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">{t('members.noMembers')}</p>
          ) : members.map(m => (
            <div key={m.userId} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                {m.name?.[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Name + email + joined */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{m.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
                {m.joinedAt && (
                  <p className="text-[10px] text-gray-600">{t('members.joinedAt', { date: formatDate(m.joinedAt) })}</p>
                )}
              </div>

              {/* Role badge / inline selector for owner */}
              {isOwner && m.role !== 'owner' ? (
                <select
                  value={m.role}
                  onChange={e => changeRole(m.userId, e.target.value)}
                  disabled={updatingRole === m.userId}
                  aria-label={t('members.changeRole')}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-transparent bg-transparent hover:border-gray-600 focus:outline-none focus:border-orange-500 disabled:opacity-40 cursor-pointer text-blue-400"
                >
                  <option value="editor">{t('members.roleEditor')}</option>
                  <option value="viewer">{t('members.roleViewer')}</option>
                </select>
              ) : (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleBadge(m.role)}`}>
                  {roleLabel(m.role)}
                </span>
              )}

              {/* Remove button */}
              {isOwner && m.userId !== currentUserId && (
                <button
                  type="button"
                  onClick={() => removeMember(m.userId)}
                  disabled={removing === m.userId}
                  aria-label={t('members.removeTitle')}
                  className="text-gray-600 hover:text-red-400 transition disabled:opacity-40 shrink-0 opacity-0 group-hover:opacity-100"
                >
                  {removing === m.userId
                    ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                </button>
              )}
            </div>
          ))}

          {/* Remove error */}
          {removeError && (
            <p className="text-[10px] text-red-400 text-center pt-1">{removeError}</p>
          )}
          {/* Role update error */}
          {roleUpdateError && (
            <p className="text-[10px] text-red-400 text-center pt-1">{roleUpdateError}</p>
          )}
        </div>

        {/* Invite form (owner only) */}
        {isOwner && (
          <div className="border-t border-gray-700 p-4 shrink-0">
            <p className="text-xs text-gray-500 font-medium mb-2">{t('members.inviteByEmail')}</p>
            <div className="flex gap-1.5">
              <label htmlFor="invite-email-input" className="sr-only">{t('members.inviteByEmail')}</label>
              <input
                id="invite-email-input"
                value={email}
                onChange={e => { setEmail(e.target.value); setInviteError(''); setInviteSuccess(false) }}
                onKeyDown={e => e.key === 'Enter' && invite()}
                placeholder={t('members.emailPlaceholder')}
                type="email"
                className={`flex-1 bg-gray-800 text-gray-200 text-xs px-2.5 py-1.5 rounded border focus:outline-none ${inviteError ? 'border-red-500' : inviteSuccess ? 'border-green-600' : 'border-gray-600 focus:border-orange-500'}`}
              />
              <label htmlFor="invite-role-select" className="sr-only">{t('members.roleEditor')}</label>
              <select id="invite-role-select" value={role} onChange={e => setRole(e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-orange-500">
                <option value="editor">{t('members.roleEditor')}</option>
                <option value="viewer">{t('members.roleViewer')}</option>
              </select>
              <button type="button" onClick={invite} disabled={inviting || !email.trim()}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs rounded transition">
                {inviting ? t('common.inviting') : t('common.invite')}
              </button>
            </div>
            {inviteError && <p className="text-[10px] text-red-400 mt-1.5">{inviteError}</p>}
            {inviteSuccess && !inviteError && (
              <p className="text-[10px] text-green-400 mt-1.5">{t('members.inviteSuccess')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
