'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Workspace, HistoryEntry, ActivityLogEntry } from '../components/types'
import { apiFetch } from '../components/utils'

export function useHistoryActivity(
  currentWs: Workspace | null,
  sidebarSection: string | null,
) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [hasMoreActivity, setHasMoreActivity] = useState(false)
  const loadingMoreHistRef = useRef(false)
  const loadingMoreActRef = useRef(false)
  // Cursors for pagination — null means no more data, undefined means not yet loaded
  const historyCursorRef = useRef<string | null | undefined>(undefined)
  const activityCursorRef = useRef<string | null | undefined>(undefined)
  const currentWsIdRef = useRef<string | null>(currentWs?.id ?? null)
  useEffect(() => { currentWsIdRef.current = currentWs?.id ?? null }, [currentWs])

  const loadHistory = useCallback(async () => {
    if (!currentWs) return
    const wsId = currentWs.id
    setLoadingHistory(true)
    try {
      const { history: h, nextCursor } = await apiFetch<{ history: HistoryEntry[], nextCursor: string | null }>(
        `/api/history?workspaceId=${wsId}&limit=50`,
      )
      if (currentWsIdRef.current === wsId) {
        setHistory(h)
        historyCursorRef.current = nextCursor
        setHasMoreHistory(nextCursor !== null)
      }
    } catch { /* ignore */ }
    finally { if (currentWsIdRef.current === wsId) setLoadingHistory(false) }
  }, [currentWs])

  const loadActivity = useCallback(async () => {
    if (!currentWs) return
    const wsId = currentWs.id
    setLoadingActivity(true)
    try {
      const { logs, nextCursor } = await apiFetch<{ logs: ActivityLogEntry[], nextCursor: string | null }>(
        `/api/workspaces/${wsId}/activity?limit=50`,
      )
      if (currentWsIdRef.current === wsId) {
        setActivityLogs(logs)
        activityCursorRef.current = nextCursor
        setHasMoreActivity(nextCursor !== null)
      }
    } catch { /* ignore */ }
    finally { if (currentWsIdRef.current === wsId) setLoadingActivity(false) }
  }, [currentWs])

  // Load history when user switches to the history tab
  useEffect(() => {
    if (sidebarSection !== 'history' || !currentWs) return
    loadHistory()
  }, [sidebarSection, currentWs, loadHistory])

  // Load activity when user switches to the activity tab
  useEffect(() => {
    if (sidebarSection !== 'activity' || !currentWs) return
    loadActivity()
  }, [sidebarSection, currentWs, loadActivity])

  useEffect(() => {
    setActivityLogs([])
    setHasMoreActivity(false)
    activityCursorRef.current = undefined
  }, [currentWs])

  const loadMoreHistory = useCallback(async () => {
    if (!currentWs || loadingMoreHistRef.current || historyCursorRef.current === null) return
    loadingMoreHistRef.current = true
    try {
      const cursor = historyCursorRef.current
      const url = cursor
        ? `/api/history?workspaceId=${currentWs.id}&limit=50&cursor=${cursor}`
        : `/api/history?workspaceId=${currentWs.id}&limit=50`
      const { history: more, nextCursor } = await apiFetch<{ history: HistoryEntry[], nextCursor: string | null }>(url)
      if (more.length > 0) setHistory(prev => [...prev, ...more])
      historyCursorRef.current = nextCursor
      setHasMoreHistory(nextCursor !== null)
    } catch { /* ignore */ }
    finally { loadingMoreHistRef.current = false }
  }, [currentWs])

  const loadMoreActivity = useCallback(async () => {
    if (!currentWs || loadingMoreActRef.current || activityCursorRef.current === null) return
    loadingMoreActRef.current = true
    try {
      const cursor = activityCursorRef.current
      const url = cursor
        ? `/api/workspaces/${currentWs.id}/activity?limit=50&cursor=${cursor}`
        : `/api/workspaces/${currentWs.id}/activity?limit=50`
      const { logs: more, nextCursor } = await apiFetch<{ logs: ActivityLogEntry[], nextCursor: string | null }>(url)
      if (more.length > 0) setActivityLogs(prev => [...prev, ...more])
      activityCursorRef.current = nextCursor
      setHasMoreActivity(nextCursor !== null)
    } catch { /* ignore */ }
    finally { loadingMoreActRef.current = false }
  }, [currentWs])

  return {
    history, setHistory,
    loadingHistory, hasMoreHistory,
    activityLogs, setActivityLogs,
    loadingActivity, hasMoreActivity,
    loadHistory, loadActivity,
    loadMoreHistory, loadMoreActivity,
  }
}
