'use client'

import { memo, useState } from 'react'
import { useTranslations } from 'next-intl'

export const RenameModal = memo(function RenameModal({ label, currentName, onSave, onCancel, title }: {
  label: string; currentName: string; onSave: (name: string) => void; onCancel: () => void; title?: string
}) {
  const t = useTranslations()
  const [name, setName] = useState(currentName)
  const headingId = 'rename-modal-title'
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="bg-th-surface border border-th-border-soft rounded-xl shadow-2xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 id={headingId} className="text-sm font-semibold text-th-text mb-3">{title ?? `${t('common.rename')} ${label}`}</h3>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          aria-label={title ?? `${t('common.rename')} ${label}`}
          className="w-full bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-th-text-3 hover:text-th-text bg-th-input rounded-md transition">{t('common.cancel')}</button>
          <button type="button" onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()} className="px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-md transition">{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
})
