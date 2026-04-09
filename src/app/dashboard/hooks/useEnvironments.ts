'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Workspace, Environment, EnvVar } from '../components/types'
import { apiFetch } from '../components/utils'
import { useToastContext } from '../components/ToastContext'

export function useEnvironments(currentWs: Workspace | null) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [currentEnvId, setCurrentEnvId] = useState<string>('none')
  const [envEditorTarget, setEnvEditorTarget] = useState<Environment | null | 'new'>(null)
  const { showToast } = useToastContext()

  useEffect(() => {
    if (!currentWs) { setEnvironments([]); setCurrentEnvId('none'); return }
    let stale = false
    apiFetch<{ environments: Environment[] }>(`/api/environments?workspaceId=${currentWs.id}`)
      .then(({ environments: envs }) => { if (!stale) { setEnvironments(envs); setCurrentEnvId('none') } })
      .catch(console.error)
    return () => { stale = true }
  }, [currentWs])

  const saveEnvironment = useCallback(async (name: string, vars: EnvVar[]) => {
    if (!currentWs) return
    try {
      if (envEditorTarget === 'new') {
        const { environment } = await apiFetch<{ environment: Environment }>('/api/environments', {
          method: 'POST', body: JSON.stringify({ workspaceId: currentWs.id, name, variables: vars })
        })
        setEnvironments(prev => [...prev, environment])
      } else if (envEditorTarget && typeof envEditorTarget === 'object') {
        const { environment } = await apiFetch<{ environment: Environment }>(`/api/environments/${envEditorTarget.id}`, {
          method: 'PUT', body: JSON.stringify({ name, variables: vars })
        })
        setEnvironments(prev => prev.map(e => e.id === environment.id ? environment : e))
      }
      setEnvEditorTarget(null)
    } catch { showToast('Failed to save environment', 'error') }
  }, [currentWs, envEditorTarget, showToast])

  const deleteEnvironment = useCallback(async (env: Environment) => {
    try {
      await apiFetch(`/api/environments/${env.id}`, { method: 'DELETE' })
      setEnvironments(prev => prev.filter(e => e.id !== env.id))
      setCurrentEnvId(prev => prev === env.id ? 'none' : prev)
    } catch { showToast('Failed to delete environment', 'error') }
  }, [showToast])

  const reloadEnvironments = useCallback(async () => {
    if (!currentWs) return
    try {
      const { environments: envs } = await apiFetch<{ environments: Environment[] }>(`/api/environments?workspaceId=${currentWs.id}`)
      setEnvironments(envs)
      setCurrentEnvId(prev => (prev === 'none' || envs.some(e => e.id === prev) ? prev : 'none'))
    } catch { /* ignore */ }
  }, [currentWs])

  return {
    environments, setEnvironments,
    currentEnvId, setCurrentEnvId,
    envEditorTarget, setEnvEditorTarget,
    saveEnvironment, deleteEnvironment, reloadEnvironments,
  }
}
