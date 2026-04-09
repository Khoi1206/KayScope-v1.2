'use client'

import { memo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { Collection, Folder } from './types'

export const SaveToCollectionModal = memo(function SaveToCollectionModal({ collections, foldersByCol, loadFolders, onSave, onCancel }: {
  collections: Collection[]
  foldersByCol: Record<string, Folder[]>
  loadFolders: (colId: string) => Promise<void>
  onSave: (colId: string, folderId: string | null) => void
  onCancel: () => void
}) {
  const t = useTranslations()
  const [colId, setColId] = useState(collections[0]?.id ?? '')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [loadingFolders, setLoadingFolders] = useState(false)

  useEffect(() => {
    if (!colId || foldersByCol[colId]) return
    setLoadingFolders(true)
    loadFolders(colId).finally(() => setLoadingFolders(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colId])

  const folders = foldersByCol[colId] ?? []
  const colSelectId = 'save-col-select'
  const folderSelectId = 'save-folder-select'

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-col-title"
        className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="save-col-title" className="text-sm font-semibold text-white">{t('saveToCollection.title')}</h3>
        {collections.length === 0 ? (
          <p className="text-xs text-gray-500">{t('saveToCollection.noCollections')}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor={colSelectId} className="text-xs text-gray-400 font-medium mb-1.5 block">{t('saveToCollection.collectionLabel')}</label>
              <select id={colSelectId} value={colId} onChange={e => { setColId(e.target.value); setFolderId(null) }}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-500">
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={folderSelectId} className="text-xs text-gray-400 font-medium mb-1.5 block">
                {t('saveToCollection.folderLabel')} <span className="text-gray-600">{t('saveToCollection.folderOptional')}</span>
              </label>
              {loadingFolders ? (
                <p className="text-xs text-gray-600 py-1">{t('saveToCollection.loadingFolders')}</p>
              ) : (
                <select id={folderSelectId} value={folderId ?? ''} onChange={e => setFolderId(e.target.value || null)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-500">
                  <option value=""> {t('saveToCollection.rootFolder')} </option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={() => colId && onSave(colId, folderId)} disabled={!colId || collections.length === 0}
            className="text-xs px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
})
