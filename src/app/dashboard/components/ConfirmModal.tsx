'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'

export const ConfirmModal = memo(function ConfirmModal({ title, message, onConfirm, onCancel, destructive, confirmLabel, secondaryAction }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean
  confirmLabel?: string
  secondaryAction?: { label: string; onClick: () => void }
}) {
  const t = useTranslations()
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-th-surface border border-th-border-soft rounded-xl shadow-2xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-sm font-semibold text-th-text mb-2">{title}</h3>
        <p className="text-xs text-th-text-3 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-th-text-3 hover:text-th-text bg-th-input rounded-md transition">{t('common.cancel')}</button>
          {secondaryAction && (
            <button type="button" onClick={secondaryAction.onClick} className="px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-600 rounded-md transition">
              {secondaryAction.label}
            </button>
          )}
          <button type="button" onClick={onConfirm} className={`px-3 py-1.5 text-xs text-white rounded-md transition ${destructive ? 'bg-red-600 hover:bg-red-500' : 'bg-th-input hover:bg-gray-600'}`}>
            {confirmLabel ?? (destructive ? t('common.delete') : t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  )
})
