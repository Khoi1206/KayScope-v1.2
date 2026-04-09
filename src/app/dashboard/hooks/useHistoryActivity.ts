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
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [dbActivityCount, setDbActivityCount] = useState(0)
  const loadingMoreHistRef = useRef(false)
  const loadingMoreActRef = useRef(false)
  const dbActivityCountRef = useRef(0)
  // Ref to avoid re-creating loadMoreHistory on every history append
  const historyLenRef = useRef(0)
  useEffect(() => { dbActivityCountRef.current = dbActivityCount }, [dbActivityCount])
  useEffect(() => { historyLenRef.current = history.length }, [history.length])
  const currentWsIdRef = useRef<string | null>(currentWs?.id ?? null)
  useEffect(() => { currentWsIdRef.current = currentWs?.id ?? null }, [currentWs])

  const loadHistory = useCallback(async () => {
    if (!currentWs) return
    const wsId = currentWs.id
    setLoadingHistory(true)
    try {
      const { history: h } = await apiFetch<{ history: HistoryEntry[] }>(`/api/history?workspaceId=${wsId}&limit=50`)
      if (currentWsIdRef.current === wsId) setHistory(h)
    } catch { /* ignore */ }
    finally { if (currentWsIdRef.current === wsId) setLoadingHistory(false) }
  }, [currentWs])

  const loadActivity = useCallback(async () => {
    if (!currentWs) return
    const wsId = currentWs.id
    setLoadingActivity(true)
    try {
      const { logs } = await apiFetch<{ logs: ActivityLogEntry[] }>(`/api/workspaces/${wsId}/activity?limit=50`)
      if (currentWsIdRef.current === wsId) {
        setActivityLogs(logs)
        setDbActivityCount(logs.length)
      }
    } catch { /* ignore */ }
    finally { if (currentWsIdRef.current === wsId) setLoadingActivity(false) }
  }, [currentWs])

  // Load history when user switches to the history tab; delegate to loadHistory
  // to avoid duplicating fetch logic.
  useEffect(() => {
    if (sidebarSection !== 'history' || !currentWs) return
    loadHistory()
  }, [sidebarSection, currentWs, loadHistory])

  // Load activity when user switches to the activity tab.
  useEffect(() => {
    if (sidebarSection !== 'activity' || !currentWs) return
    loadActivity()
  }, [sidebarSection, currentWs, loadActivity])

  useEffect(() => {
    setActivityLogs([]); setDbActivityCount(0)
  }, [currentWs])

  const loadMoreHistory = useCallback(async () => {
    if (!currentWs || loadingMoreHistRef.current) return
    loadingMoreHistRef.current = true
    try {
      // Read skip from ref so this callback is not re-created on every history append
      const { history: more } = await apiFetch<{ history: HistoryEntry[] }>(`/api/history?workspaceId=${currentWs.id}&limit=50&skip=${historyLenRef.current}`)
      if (more.length > 0) setHistory(prev => [...prev, ...more])
    } catch { /* ignore */ }
    finally { loadingMoreHistRef.current = false }
  }, [currentWs])

  const loadMoreActivity = useCallback(async () => {
    if (!currentWs || loadingMoreActRef.current) return
    loadingMoreActRef.current = true
    try {
      const { logs: more } = await apiFetch<{ logs: ActivityLogEntry[] }>(`/api/workspaces/${currentWs.id}/activity?limit=50&skip=${dbActivityCountRef.current}`)
      if (more.length > 0) {
        setActivityLogs(prev => [...prev, ...more])
        setDbActivityCount(c => c + more.length)
      }
    } catch { /* ignore */ }
    finally { loadingMoreActRef.current = false }
  }, [currentWs])

  return {
    history, setHistory,
    loadingHistory,
    activityLogs, setActivityLogs,
    loadingActivity,
    dbActivityCount,
    loadHistory, loadActivity,
    loadMoreHistory, loadMoreActivity,
  }
}
