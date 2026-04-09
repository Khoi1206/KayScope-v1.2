'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Workspace } from '../components/types'
import { apiFetch } from '../components/utils'

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWs, setCurrentWs] = useState<Workspace | null>(null)
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [showWsCreate, setShowWsCreate] = useState(false)
  const [wsCreateError, setWsCreateError] = useState('')
  const [loadingWs, setLoadingWs] = useState(true)
  const wsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stale = false
    setLoadingWs(true)
    apiFetch<{ workspaces: Workspace[] }>('/api/workspaces')
      .then(({ workspaces: ws }) => {
        if (stale) return
        setWorkspaces(ws)
        if (ws.length > 0) setCurrentWs(ws[0])
      })
      .catch(console.error)
      .finally(() => { if (!stale) setLoadingWs(false) })
    return () => { stale = true }
  }, [])

  useEffect(() => {
    if (workspaces.length === 0) { setCurrentWs(null) }
    else if (!workspaces.find(w => w.id === currentWs?.id)) { setCurrentWs(workspaces[0]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setShowWsDropdown(false); setWsCreateError('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const createWorkspace = useCallback(async () => {
    const name = newWsName.trim()
    if (name.length < 2) { setWsCreateError('Name must be at least 2 characters'); return }
    setWsCreateError('')
    try {
      const { workspace } = await apiFetch<{ workspace: Workspace }>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) })
      setWorkspaces(prev => [...prev, workspace]); setCurrentWs(workspace)
      setNewWsName(''); setShowWsCreate(false); setShowWsDropdown(false)
    } catch (e) { setWsCreateError(e instanceof Error ? e.message : 'Failed to create workspace') }
  }, [newWsName])

  const renameWorkspace = useCallback(async (ws: Workspace, newName: string) => {
    const { workspace } = await apiFetch<{ workspace: Workspace }>(`/api/workspaces/${ws.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) })
    setWorkspaces(prev => prev.map(w => w.id === ws.id ? workspace : w))
    setCurrentWs(prev => prev?.id === ws.id ? workspace : prev)
  }, [])

  const deleteWorkspace = useCallback(async (ws: Workspace) => {
    await apiFetch(`/api/workspaces/${ws.id}`, { method: 'DELETE' })
    setWorkspaces(prev => prev.filter(w => w.id !== ws.id))
  }, [])

  return {
    workspaces, setWorkspaces, currentWs, setCurrentWs,
    showWsDropdown, setShowWsDropdown,
    newWsName, setNewWsName,
    showWsCreate, setShowWsCreate,
    wsCreateError, setWsCreateError,
    loadingWs, wsDropdownRef,
    createWorkspace, renameWorkspace, deleteWorkspace,
  }
}
