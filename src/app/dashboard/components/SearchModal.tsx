'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { Collection, SavedRequest, FolderTreeResult } from './types'
import { METHOD_COLOR } from './constants'

interface SearchModalProps {
  collections: Collection[]
  folderTrees: Record<string, FolderTreeResult>
  onOpen: (req: SavedRequest) => void
  onClose: () => void
}

interface SearchResult {
  req: SavedRequest
  collection: Collection
  folderPath: string
}

function buildIndex(
  collections: Collection[],
  folderTrees: Record<string, FolderTreeResult>,
): SearchResult[] {
  const results: SearchResult[] = []

  for (const col of collections) {
    const tree = folderTrees[col.id]
    if (!tree) continue

    // Build folder name map for path display
    const folderNames = new Map<string, string>()
    function collectFolderNames(nodes: FolderTreeResult['rootFolders'], prefix = '') {
      for (const node of nodes) {
        folderNames.set(node.folder.id, prefix ? `${prefix} / ${node.folder.name}` : node.folder.name)
        collectFolderNames(node.children, folderNames.get(node.folder.id)!)
      }
    }
    collectFolderNames(tree.rootFolders)

    // Root requests
    for (const req of tree.rootRequests) {
      results.push({ req, collection: col, folderPath: '' })
    }

    // Folder requests (depth-first)
    function walkFolders(nodes: FolderTreeResult['rootFolders']) {
      for (const node of nodes) {
        for (const req of node.requests) {
          results.push({ req, collection: col, folderPath: folderNames.get(node.folder.id) ?? node.folder.name })
        }
        walkFolders(node.children)
      }
    }
    walkFolders(tree.rootFolders)
  }

  return results
}

export function SearchModal({ collections, folderTrees, onOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const index = useMemo(
    () => buildIndex(collections, folderTrees),
    [collections, folderTrees],
  )

  const results = useMemo(() => {
    if (!query.trim()) return index.slice(0, 20)
    const q = query.toLowerCase()
    return index.filter(r =>
      r.req.name.toLowerCase().includes(q) ||
      r.req.url.toLowerCase().includes(q) ||
      r.req.method.toLowerCase().includes(q) ||
      r.collection.name.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [index, query])

  // Reset selection when results change
  useEffect(() => setSelected(0), [results])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selected]) { onOpen(results[selected].req); onClose() }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected, onOpen, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl mx-4 bg-th-surface border border-th-border-soft rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-th-border">
          <svg className="w-4 h-4 text-th-text-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search requests, URLs…"
            className="flex-1 bg-transparent text-sm text-th-text placeholder:text-th-text-3 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-th-text-3 hover:text-th-text transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="text-[10px] text-th-text-3 border border-th-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && (
            <p className="text-xs text-th-text-3 text-center py-6">
              {query ? 'No results found.' : 'No requests yet.'}
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={r.req.id}
              onClick={() => { onOpen(r.req); onClose() }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${i === selected ? 'bg-th-input/60' : 'hover:bg-th-input/30'}`}
            >
              <span className={`text-[10px] font-bold w-10 shrink-0 ${METHOD_COLOR[r.req.method] ?? 'text-gray-400'}`}>
                {r.req.method}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-th-text truncate">{r.req.name}</p>
                <p className="text-[10px] text-th-text-3 truncate">{r.req.url || '—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-th-text-3 truncate max-w-[120px]">{r.collection.name}</p>
                {r.folderPath && <p className="text-[10px] text-th-text-3/60 truncate max-w-[120px]">{r.folderPath}</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-th-border text-[10px] text-th-text-3">
          <span><kbd className="border border-th-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-th-border rounded px-1">↵</kbd> open</span>
          <span className="ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
