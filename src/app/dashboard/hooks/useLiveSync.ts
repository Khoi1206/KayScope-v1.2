'use client'

import { useState, useEffect, useRef } from 'react'
import type { Workspace, ActivityLogEntry } from '../components/types'
import { apiFetch } from '../components/utils'

interface LiveSyncCallbacks {
  reloadCollections: () => void
  reloadEnvironments: () => void
  reloadExpandedCollectionData: () => void
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLogEntry[]>>
}

export function useLiveSync(
  currentWsId: string | undefined,
  userId: string,
  callbacks: LiveSyncCallbacks,
) {
  const [liveConnected, setLiveConnected] = useState(false)

  const callbacksRef = useRef(callbacks)
  useEffect(() => { callbacksRef.current = callbacks })

  useEffect(() => {
    if (!currentWsId) return
    const es = new EventSource(`/api/workspaces/${currentWsId}/sync`)
    es.addEventListener('connected', () => setLiveConnected(true))
    es.addEventListener('activity', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as ActivityLogEntry
        if (event.userId === userId) return
        const { reloadCollections, reloadEnvironments, reloadExpandedCollectionData, setWorkspaces, setActivityLogs } = callbacksRef.current
        if (event.resourceType === 'collection' || event.resourceType === 'workspace') {
          reloadCollections()
        } else if (event.resourceType === 'request' || event.resourceType === 'folder') {
          reloadExpandedCollectionData()
        } else if (event.resourceType === 'environment') {
          reloadEnvironments()
        } else if (event.resourceType === 'member') {
          apiFetch<{ workspaces: Workspace[] }>('/api/workspaces')
            .then(({ workspaces: ws }) => setWorkspaces(ws))
            .catch(() => {})
        }
        setActivityLogs(prev => [event, ...prev.slice(0, 99)])
      } catch { /* malformed event */ }
    })
    es.onerror = () => setLiveConnected(false)
    return () => { es.close(); setLiveConnected(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWsId, userId])

  return { liveConnected }
}
