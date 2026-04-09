'use client'

import { useState, useCallback, useRef } from 'react'
import type { SavedRequest, FolderTreeResult, ExecResponse, KV, ReqBody, ReqAuth } from '../components/types'

export interface RunRequestResult {
  requestId: string
  name: string
  method: string
  url: string
  status: number | null
  statusText: string
  durationMs: number
  error: string | null
  passed: boolean
}

export type RunnerStatus = 'idle' | 'running' | 'done' | 'aborted'

export interface CollectionRunnerState {
  status: RunnerStatus
  results: RunRequestResult[]
  currentIndex: number
  totalCount: number
}

interface RunnerOptions {
  workspaceId: string
  collectionId: string
  environmentId: string | null
  envVars: Record<string, string>
}

/** Flatten a FolderTreeResult into an ordered list of requests (root first, then folders depth-first). */
export function flattenRequests(tree: FolderTreeResult): SavedRequest[] {
  const result: SavedRequest[] = [...tree.rootRequests]
  function walk(nodes: typeof tree.rootFolders) {
    for (const node of nodes) {
      result.push(...node.requests)
      walk(node.children)
    }
  }
  walk(tree.rootFolders)
  return result
}

export function useCollectionRunner() {
  const [state, setState] = useState<CollectionRunnerState>({
    status: 'idle',
    results: [],
    currentIndex: 0,
    totalCount: 0,
  })
  const abortRef = useRef(false)

  const run = useCallback(async (
    requests: SavedRequest[],
    opts: RunnerOptions,
    enabledIds: Set<string>,
  ) => {
    const enabled = requests.filter(r => enabledIds.has(r.id))
    if (enabled.length === 0) return

    abortRef.current = false
    setState({ status: 'running', results: [], currentIndex: 0, totalCount: enabled.length })

    let tempVars: Record<string, string> = {}
    const results: RunRequestResult[] = []

    for (let i = 0; i < enabled.length; i++) {
      if (abortRef.current) {
        setState(s => ({ ...s, status: 'aborted' }))
        return
      }

      const req = enabled[i]
      setState(s => ({ ...s, currentIndex: i }))

      try {
        const body = {
          method: req.method,
          url: req.url,
          headers: req.headers as KV[],
          params: req.params as KV[],
          body: req.body as ReqBody,
          auth: req.auth as ReqAuth,
          preRequestScript: req.preRequestScript ?? '',
          postRequestScript: req.postRequestScript ?? '',
          workspaceId: opts.workspaceId,
          requestId: req.id,
          environmentId: opts.environmentId ?? undefined,
          environmentVariables: opts.envVars,
          tempVariables: tempVars,
        }

        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
          results.push({ requestId: req.id, name: req.name, method: req.method, url: req.url, status: res.status, statusText: res.statusText, durationMs: 0, error: err.error ?? res.statusText, passed: false })
        } else {
          const data = await res.json() as ExecResponse & { tempVariables?: Record<string, string> }
          // Carry forward temp vars from post-request script side effects
          if (data.tempVariables) tempVars = { ...tempVars, ...data.tempVariables }
          results.push({ requestId: req.id, name: req.name, method: req.method, url: req.url, status: data.status, statusText: data.statusText, durationMs: data.durationMs, error: null, passed: data.status < 400 })
        }
      } catch (err) {
        results.push({ requestId: req.id, name: req.name, method: req.method, url: req.url, status: null, statusText: '', durationMs: 0, error: err instanceof Error ? err.message : 'Network error', passed: false })
      }

      setState(s => ({ ...s, results: [...results] }))
    }

    setState(s => ({ ...s, status: 'done', currentIndex: enabled.length }))
  }, [])

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  const reset = useCallback(() => {
    abortRef.current = false
    setState({ status: 'idle', results: [], currentIndex: 0, totalCount: 0 })
  }, [])

  return { state, run, abort, reset }
}
