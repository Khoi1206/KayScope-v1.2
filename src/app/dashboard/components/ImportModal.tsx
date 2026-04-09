'use client'

import { useState, useRef, useCallback } from 'react'

interface ImportModalProps {
  workspaceId: string
  onImported: () => void
  onClose: () => void
}

type ImportStatus = 'idle' | 'loading' | 'success' | 'error'

export function ImportModal({ workspaceId, onImported, onClose }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [result, setResult] = useState<{ importedRequests: number; format: string } | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.json') && !name.endsWith('.yaml') && !name.endsWith('.yml')) {
      setError('Only .json, .yaml, and .yml files are supported.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB limit.')
      return
    }
    setFile(f)
    setError('')
    setStatus('idle')
    setResult(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handleImport = async () => {
    if (!file) return
    setStatus('loading')
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('workspaceId', workspaceId)
      const res = await fetch('/api/import', { method: 'POST', body: form })
      const json = await res.json() as { importedRequests?: number; format?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      setResult({ importedRequests: json.importedRequests ?? 0, format: json.format ?? '' })
      setStatus('success')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('error')
    }
  }

  const formatLabel = (fmt: string) => {
    if (fmt === 'openapi') return 'OpenAPI 3.x'
    if (fmt === 'postman') return 'Postman v2.1'
    if (fmt === 'kayscope') return 'KayScope'
    return fmt
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-th-surface border border-th-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-th-text">Import Collection</h2>
          <button onClick={onClose} className="text-th-text-3 hover:text-th-text transition p-1 rounded hover:bg-th-input">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format info */}
        <p className="text-xs text-th-text-3 mb-4">
          Supports <span className="text-orange-400 font-medium">OpenAPI 3.x</span> (.json, .yaml),{' '}
          <span className="text-orange-400 font-medium">Postman v2.1</span> (.json), and{' '}
          <span className="text-orange-400 font-medium">KayScope</span> (.json) exports.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition mb-4 ${
            isDragging
              ? 'border-orange-500 bg-orange-500/5'
              : file
              ? 'border-green-500/60 bg-green-500/5'
              : 'border-th-border-soft hover:border-orange-500/50 hover:bg-th-raised'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {file ? (
            <>
              <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-th-text">{file.name}</p>
              <p className="text-xs text-th-text-3 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-th-text-3 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-th-text-2">Drop file here or <span className="text-orange-400">click to browse</span></p>
              <p className="text-xs text-th-text-3 mt-1">JSON, YAML · Max 5 MB</p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
            Imported {result.importedRequests} request{result.importedRequests !== 1 ? 's' : ''} from{' '}
            <span className="font-medium">{formatLabel(result.format)}</span> format.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-th-text-2 hover:text-th-text bg-th-input hover:bg-th-raised rounded-lg transition"
          >
            {status === 'success' ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            disabled={!file || status === 'loading' || status === 'success'}
            className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === 'loading' && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === 'loading' ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
