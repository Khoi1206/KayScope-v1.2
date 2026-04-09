'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Collection, FolderTreeResult, Environment } from './types'
import { METHOD_COLOR } from './constants'
import { flattenRequests, useCollectionRunner } from '../hooks/useCollectionRunner'
import type { RunRequestResult } from '../hooks/useCollectionRunner'

interface CollectionRunnerPanelProps {
  collection: Collection
  tree: FolderTreeResult | undefined
  workspaceId: string
  currentEnvId: string
  environments: Environment[]
  onClose: () => void
}

function StatusBadge({ status, error }: { status: number | null; error: string | null }) {
  if (error) return <span className="text-xs font-bold text-red-400">ERROR</span>
  if (status === null) return <span className="text-xs font-bold text-gray-500">—</span>
  const color = status < 300 ? 'text-green-400' : status < 400 ? 'text-yellow-400' : status < 500 ? 'text-orange-400' : 'text-red-400'
  return <span className={`text-xs font-bold ${color}`}>{status}</span>
}

export function CollectionRunnerPanel({
  collection, tree, workspaceId, currentEnvId, environments, onClose,
}: CollectionRunnerPanelProps) {
  const requests = useMemo(() => tree ? flattenRequests(tree) : [], [tree])
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => new Set(requests.map(r => r.id)))

  useEffect(() => {
    if (requests.length > 0) setEnabledIds(new Set(requests.map(r => r.id)))
  }, [requests])
  const { state, run, abort, reset } = useCollectionRunner()

  const currentEnv = environments.find(e => e.id === currentEnvId)
  const envVars = useMemo(() => {
    const vars: Record<string, string> = {}
    if (currentEnv) {
      for (const v of currentEnv.variables) {
        if (v.enabled && v.key) vars[v.key] = v.value
      }
    }
    return vars
  }, [currentEnv])

  const toggleAll = (checked: boolean) => {
    setEnabledIds(checked ? new Set(requests.map(r => r.id)) : new Set())
  }
  const toggleOne = (id: string) => {
    setEnabledIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleRun = () => {
    run(requests, {
      workspaceId,
      collectionId: collection.id,
      environmentId: currentEnvId === 'none' ? null : currentEnvId,
      envVars,
    }, enabledIds)
  }

  const isRunning = state.status === 'running'
  const isDone = state.status === 'done' || state.status === 'aborted'
  const resultMap = useMemo(() => {
    const m = new Map<string, RunRequestResult>()
    for (const r of state.results) m.set(r.requestId, r)
    return m
  }, [state.results])

  const passed = state.results.filter(r => r.passed).length
  const failed = state.results.filter(r => !r.passed).length
  const enabledCount = enabledIds.size

  return (
    <div className="flex flex-col h-full bg-th-surface border-l border-th-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-th-border shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] text-th-text-3 uppercase tracking-wider font-semibold">Collection Runner</p>
          <h2 className="text-sm font-semibold text-th-text truncate">{collection.name}</h2>
        </div>
        <button onClick={onClose} className="text-th-text-3 hover:text-th-text transition p-1 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-th-border shrink-0 flex items-center gap-2">
        {!isRunning ? (
          <>
            <button
              onClick={handleRun}
              disabled={enabledCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run {enabledCount} request{enabledCount !== 1 ? 's' : ''}
            </button>
            {isDone && (
              <button onClick={reset} className="px-3 py-1.5 text-xs text-th-text-2 hover:text-th-text bg-th-input hover:bg-th-raised rounded-lg transition">
                Reset
              </button>
            )}
          </>
        ) : (
          <button onClick={abort} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </button>
        )}

        {currentEnv && (
          <span className="ml-auto text-[10px] text-th-text-3 flex items-center gap-1">
            <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h12M3 17h6" />
            </svg>
            {currentEnv.name}
          </span>
        )}
      </div>

      {/* Summary bar (shown when running or done) */}
      {(isRunning || isDone) && state.totalCount > 0 && (
        <div className="px-4 py-2 border-b border-th-border shrink-0 flex items-center gap-4 bg-th-raised/50">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-th-text-2">{passed} passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-th-text-2">{failed} failed</span>
          </div>
          <div className="ml-auto text-xs text-th-text-3">
            {isRunning ? `${state.results.length} / ${state.totalCount}` : state.status === 'aborted' ? 'Aborted' : 'Done'}
          </div>
          {/* Progress bar */}
          {isRunning && (
            <div className="w-24 h-1 bg-th-input rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${(state.results.length / state.totalCount) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Request list */}
      <div className="flex-1 overflow-y-auto py-2">
        {requests.length === 0 && (
          <p className="text-xs text-th-text-3 px-4 py-6 text-center">No requests in this collection.</p>
        )}

        {/* Select-all row */}
        {requests.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 mb-1">
            <input
              type="checkbox"
              checked={enabledIds.size === requests.length}
              onChange={e => toggleAll(e.target.checked)}
              className="accent-orange-500"
            />
            <span className="text-[10px] text-th-text-3 uppercase tracking-wider font-semibold">Select all</span>
          </div>
        )}

        {requests.map((req, idx) => {
          const result = resultMap.get(req.id)
          const isActive = isRunning && state.currentIndex === idx && !result
          return (
            <div
              key={req.id}
              className={`flex items-center gap-2.5 px-4 py-2 transition ${isActive ? 'bg-th-input/40' : 'hover:bg-th-input/20'}`}
            >
              <input
                type="checkbox"
                checked={enabledIds.has(req.id)}
                onChange={() => toggleOne(req.id)}
                disabled={isRunning}
                className="accent-orange-500 shrink-0"
              />
              <span className={`text-[10px] font-bold w-11 shrink-0 ${METHOD_COLOR[req.method as keyof typeof METHOD_COLOR] ?? 'text-gray-400'}`}>
                {req.method}
              </span>
              <span className="text-xs text-th-text-2 truncate flex-1">{req.name}</span>

              {/* Result */}
              {result ? (
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={result.status} error={result.error} />
                  {result.durationMs > 0 && (
                    <span className="text-[10px] text-th-text-3">{result.durationMs}ms</span>
                  )}
                  {result.passed
                    ? <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                </div>
              ) : isActive ? (
                <svg className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
