'use client'

import { memo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Environment, EnvVar } from './types'

export const EnvEditorModal = memo(function EnvEditorModal({ env, onSave, onCancel }: {
  env: Environment | null; onSave: (name: string, vars: EnvVar[]) => void; onCancel: () => void
}) {
  const t = useTranslations()
  const [name, setName] = useState(env?.name ?? '')
  const [vars, setVars] = useState<EnvVar[]>(env?.variables ?? [{ key: '', value: '', enabled: true, secret: false }])

  const updateVar = (idx: number, field: keyof EnvVar, val: string | boolean) => {
    setVars(prev => prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v)))
  }
  const addVar = () => setVars(prev => [...prev, { key: '', value: '', enabled: true, secret: false }])
  const removeVar = (idx: number) => setVars(prev => prev.filter((_, i) => i !== idx))

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="env-editor-modal-title"
        className="bg-th-surface border border-th-border-soft rounded-xl shadow-2xl w-full max-w-lg p-5 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="env-editor-modal-title" className="text-sm font-semibold text-th-text mb-3">
          {env ? t('env.editTitle') : t('env.createTitle')}
        </h3>
        <label htmlFor="env-name-input" className="sr-only">{t('env.editTitle')}</label>
        <input
          id="env-name-input"
          autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder={t('env.namePlaceholder')}
          className="w-full bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm text-th-text placeholder-th-text-3 focus:outline-none focus:border-orange-500 mb-3"
        />
        <div className="text-xs text-th-text-3 font-medium mb-2">{t('env.variables')}</div>
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
          {vars.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5 group">
              <input type="checkbox" checked={v.enabled} onChange={e => updateVar(i, 'enabled', e.target.checked)} className="accent-orange-500 shrink-0" aria-label={`Enable variable ${i + 1}`} />
              <input value={v.key} onChange={e => updateVar(i, 'key', e.target.value)} placeholder={t('env.keyPlaceholder')} aria-label={t('env.keyPlaceholder')}
                className="flex-1 bg-th-input border border-th-border-soft rounded px-2 py-1.5 text-th-text-2 text-xs placeholder-th-text-3 focus:outline-none focus:border-orange-500 font-mono" />
              <input value={v.value} onChange={e => updateVar(i, 'value', e.target.value)} placeholder={t('env.valuePlaceholder')} aria-label={t('env.valuePlaceholder')}
                type={v.secret ? 'password' : 'text'}
                className="flex-1 bg-th-input border border-th-border-soft rounded px-2 py-1.5 text-th-text-2 text-xs placeholder-th-text-3 focus:outline-none focus:border-orange-500 font-mono" />
              <button type="button" onClick={() => updateVar(i, 'secret', !v.secret)} aria-pressed={v.secret} aria-label={t('common.toggleSecret')} className={`shrink-0 text-xs px-1 ${v.secret ? 'text-orange-400' : 'text-th-text-3'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={v.secret ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
              </button>
              <button type="button" onClick={() => removeVar(i)} aria-label={t('common.removeRow')} className="text-gray-600 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addVar} className="flex items-center gap-1 text-xs text-th-text-3 hover:text-th-text-2 mt-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('common.addVariable')}
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-th-text-3 hover:text-th-text bg-th-input rounded-md transition">{t('common.cancel')}</button>
          <button type="button" onClick={() => name.trim() && onSave(name.trim(), vars)} disabled={!name.trim()} className="px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-md transition">
            {env ? t('env.update') : t('env.create')}
          </button>
        </div>
      </div>
    </div>
  )
})
