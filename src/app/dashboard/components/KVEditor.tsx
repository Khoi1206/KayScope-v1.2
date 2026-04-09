'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import type { KV } from './types'
import { EMPTY_KV } from './constants'
import { renderHighlightedUrl } from './url-vars'

type KVEditorProps = {
  rows: KV[]
  onChange: (rows: KV[]) => void
  resolveVars?: (text: string) => { resolved: string; hasUnresolved: boolean } | null
  onVarHover?: (name: string) => void
  onVarLeave?: () => void
  activeVar?: string | null
  varPopup?: React.ReactNode
}

export const KVEditor = memo(function KVEditor({ rows, onChange, resolveVars, onVarHover, onVarLeave, activeVar, varPopup }: KVEditorProps) {
  const t = useTranslations('kvEditor')
  const update = (idx: number, field: keyof KV, val: string | boolean) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    onChange(next)
  }
  const add = () => onChange([...rows, EMPTY_KV()])
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx))

  return (
    <div className="text-xs">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="w-8 pb-2" />
            <th scope="col" className="text-left pb-2 font-medium">{t('keyHeader')}</th>
            <th scope="col" className="text-left pb-2 pl-2 font-medium">{t('valueHeader')}</th>
            <th scope="col" className="text-left pb-2 pl-2 font-medium hidden sm:table-cell">{t('descHeader')}</th>
            <th className="w-8 pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/40 group">
              <td className="py-1.5 pr-2">
                <input type="checkbox" checked={row.enabled} onChange={(e) => update(i, 'enabled', e.target.checked)} className="accent-orange-500" aria-label={`Enable row ${i + 1}`} />
              </td>
              <td className="py-1.5">
                <div className="relative">
                  <div aria-hidden className="absolute inset-0 z-10 text-gray-300 pointer-events-none overflow-hidden whitespace-pre">{renderHighlightedUrl(row.key, onVarHover, onVarLeave)}</div>
                  <input value={row.key} onChange={(e) => update(i, 'key', e.target.value)} placeholder={t('keyPlaceholder')} aria-label={t('keyPlaceholder')} style={{ caretColor: '#d1d5db' }} className="relative w-full bg-transparent text-transparent placeholder-gray-600 focus:outline-none selection:bg-blue-500/30" />
                </div>
              </td>
              <td className="py-1.5 pl-2">
                <div className="relative">
                  <div aria-hidden className="absolute inset-0 z-10 text-gray-300 pointer-events-none overflow-hidden whitespace-pre">{renderHighlightedUrl(row.value, onVarHover, onVarLeave)}</div>
                  <input value={row.value} onChange={(e) => update(i, 'value', e.target.value)} placeholder={t('valuePlaceholder')} aria-label={t('valuePlaceholder')} style={{ caretColor: '#d1d5db' }} className="relative w-full bg-transparent text-transparent placeholder-gray-600 focus:outline-none selection:bg-blue-500/30" />
                  {activeVar && varPopup && (row.value.includes('{{' + activeVar + '}}') || row.key.includes('{{' + activeVar + '}}')) && varPopup}
                </div>
                {resolveVars && (() => {
                  const hint = resolveVars(row.value)
                  if (!hint) return null
                  return <p className={`mt-0.5 text-[10px] font-mono truncate max-w-xs ${hint.hasUnresolved ? 'text-yellow-600/80' : 'text-gray-500'}`} title={hint.resolved}>→ {hint.resolved}</p>
                })()}
              </td>
              <td className="py-1.5 pl-2 hidden sm:table-cell">
                <input value={row.description ?? ''} onChange={(e) => update(i, 'description', e.target.value)} placeholder={t('descPlaceholder')} aria-label={t('descPlaceholder')} className="w-full bg-transparent text-gray-400 placeholder-gray-600 focus:outline-none" />
              </td>
              <td className="py-1.5 pl-1">
                <button type="button" onClick={() => remove(i)} aria-label={t('removeRow')} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={add} className="mt-2 flex items-center gap-1 text-gray-500 hover:text-gray-300 transition">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {t('addRow')}
      </button>
    </div>
  )
})
