'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { runScript } from '@/lib/scripting/script-runner'
import { useDebounce } from './useDebounce'

import type {
  SavedRequest, Environment, EnvVar, Workspace,
  ExecResponse, HistoryEntry, HttpMethod, KV, ReqBody, ReqAuth,
  ScriptResult, TabSnapshot, RequestTabMeta, RequestEditorTab,
} from '../components/types'
import {
  DEFAULT_HEADERS, EMPTY_BODY, EMPTY_AUTH, mkBlankSnapshot, TabFactory,
} from '../components/constants'
import { apiFetch } from '../components/utils'

export interface UseRequestEditorDeps {
  currentWs: Workspace | null
  environments: Environment[]
  currentEnvId: string
  setEnvironments: Dispatch<SetStateAction<Environment[]>>
  setRequestsByCol: Dispatch<SetStateAction<Record<string, SavedRequest[]>>>
  sidebarSection: string | null
  loadHistory: () => void
}

export function useRequestEditor(deps: UseRequestEditorDeps) {
  const {
    currentWs, environments, currentEnvId,
    setEnvironments, setRequestsByCol,
    sidebarSection, loadHistory,
  } = deps

  const [activeReq, setActiveReq] = useState<SavedRequest | null>(null)
  const [isDraft, setIsDraft] = useState(false)
  const [draftColId, setDraftColId] = useState<string | null>(null)
  const [draftFolderId, setDraftFolderId] = useState<string | null>(null)
  const [reqName, setReqName] = useState('New Request')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [params, setParams] = useState<KV[]>([])
  const [headers, setHeaders] = useState<KV[]>(DEFAULT_HEADERS)
  const [body, setBody] = useState<ReqBody>(EMPTY_BODY)
  const [auth, setAuth] = useState<ReqAuth>(EMPTY_AUTH)
  const [activeTab, setActiveTab] = useState<RequestEditorTab>('Params')

  const [preRequestScript, setPreRequestScript] = useState('')
  const [postRequestScript, setPostRequestScript] = useState('')
  const [tempVars, setTempVars] = useState<Record<string, string>>({})
  const [preScriptResult, setPreScriptResult] = useState<ScriptResult | null>(null)
  const [postScriptResult, setPostScriptResult] = useState<ScriptResult | null>(null)

  const [tabs, setTabs] = useState<RequestTabMeta[]>([])
  const [activeTabId, setActiveTabId] = useState('')

  const [response, setResponse] = useState<ExecResponse | null>(null)
  const [responseTab, setResponseTab] = useState<'Pretty' | 'Headers' | 'Cookies' | 'Timing' | 'Raw'>('Pretty')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [requestTiming, setRequestTiming] = useState<{
    dns: number; connect: number; tls: number; firstByte: number; download: number; total: number
  } | null>(null)

  const [varOverrides, setVarOverrides] = useState<Record<string, string>>({})

  const setVarOverride = useCallback((name: string, value: string) => {
    setVarOverrides(prev =>
      value === ''
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name))
        : { ...prev, [name]: value }
    )
  }, [])

  const [isSaving, setIsSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveToColModal, setSaveToColModal] = useState(false)

  const activeTabIdRef = useRef(activeTabId)
  activeTabIdRef.current = activeTabId
  const abortRef = useRef<AbortController | null>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)
  const saveFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipDirtyRef = useRef(false)

  // ── Stable refs — kept in sync every render so memoized callbacks ──────────
  // can read current values without listing them all in deps arrays.

  /** Always holds the latest snapshot-able editor state. */
  const snapRef = useRef<TabSnapshot>({
    activeReq: null, isDraft: false, draftColId: null, draftFolderId: null,
    reqName: 'New Request', method: 'GET' as HttpMethod, url: '', params: [], headers: [],
    body: EMPTY_BODY, auth: EMPTY_AUTH, activeTab: 'Params' as RequestEditorTab,
    preRequestScript: '', postRequestScript: '', tempVars: {},
    preScriptResult: null, postScriptResult: null,
    response: null, responseTab: 'Pretty' as const,
    requestTiming: null, sendError: null, isSending: false, varOverrides: {},
  })
  snapRef.current = {
    activeReq, isDraft, draftColId, draftFolderId,
    reqName, method, url, params, headers, body, auth, activeTab,
    preRequestScript, postRequestScript, tempVars,
    preScriptResult, postScriptResult,
    response, responseTab, requestTiming, sendError, isSending,
    varOverrides,
  }

  /** Live values needed by tab-management callbacks. */
  const tabValsRef = useRef({ activeTabId, tabs, reqName, method, activeReq })
  tabValsRef.current = { activeTabId, tabs, reqName, method, activeReq }

  /** Live values needed by saveRequest / sendRequest. */
  const execRef = useRef({
    url, method, params, headers, body, auth, reqName,
    preRequestScript, postRequestScript, tempVars, varOverrides,
    activeReq, isDraft, draftColId, draftFolderId, activeTabId,
    currentWs, currentEnvId, environments, sidebarSection, loadHistory,
  })
  execRef.current = {
    url, method, params, headers, body, auth, reqName,
    preRequestScript, postRequestScript, tempVars, varOverrides,
    activeReq, isDraft, draftColId, draftFolderId, activeTabId,
    currentWs, currentEnvId, environments, sidebarSection, loadHistory,
  }

  useEffect(() => {
    return () => { if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current) }
  }, [])

  const debouncedUrl = useDebounce(url, 300)
  const skipParamSyncRef = useRef(false)

  useEffect(() => {
    if (skipParamSyncRef.current) { skipParamSyncRef.current = false; return }
    try {
      const qIdx = debouncedUrl.indexOf('?')
      if (qIdx === -1) return
      const search = new URLSearchParams(debouncedUrl.slice(qIdx + 1))
      const parsed: KV[] = []
      search.forEach((value, key) => {
        parsed.push({ key, value, enabled: true, description: '' })
      })
      if (parsed.length > 0) setParams(parsed)
    } catch { /* invalid URL — ignore */ }
  }, [debouncedUrl])

  /** Stable — reads from snapRef so it never needs to be recreated. */
  const captureSnapshot = useCallback((): TabSnapshot => ({ ...snapRef.current }), [])

  /** Stable — only calls state setters which are permanently stable. */
  const restoreSnapshot = useCallback((s: TabSnapshot) => {
    skipDirtyRef.current = true
    setActiveReq(s.activeReq); setIsDraft(s.isDraft)
    setDraftColId(s.draftColId); setDraftFolderId(s.draftFolderId)
    setReqName(s.reqName); setMethod(s.method); setUrl(s.url)
    skipParamSyncRef.current = true
    setParams(s.params); setHeaders(s.headers); setBody(s.body); setAuth(s.auth)
    setActiveTab(s.activeTab)
    setPreRequestScript(s.preRequestScript); setPostRequestScript(s.postRequestScript)
    setTempVars(s.tempVars)
    setPreScriptResult(s.preScriptResult); setPostScriptResult(s.postScriptResult)
    setResponse(s.response); setResponseTab(s.responseTab)
    setRequestTiming(s.requestTiming); setSendError(s.sendError)
    setIsSending(s.isSending)
    setVarOverrides(s.varOverrides ?? {})
    setSaveError('')
  }, [])

  useEffect(() => {
    if (skipDirtyRef.current) { skipDirtyRef.current = false; return }
    if (!activeTabId) return
    setTabs(prev => prev.map(t => t.id === activeTabId && !t.dirty ? { ...t, dirty: true } : t))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqName, method, url, params, headers, body, auth, preRequestScript, postRequestScript])

  const switchToTab = useCallback((id: string) => {
    const { activeTabId: curTabId, tabs: curTabs, reqName: curName, method: curMethod, activeReq: curReq } = tabValsRef.current
    if (id === curTabId) return
    const target = curTabs.find(t => t.id === id)
    if (!target) return
    const snapshot = captureSnapshot()
    setTabs(prev => prev.map(t => t.id === curTabId
      ? { ...t, label: curName, method: curMethod, savedReqId: curReq?.id ?? null, snapshot }
      : t
    ))
    restoreSnapshot(target.snapshot ?? mkBlankSnapshot())
    setActiveTabId(id)
  }, [captureSnapshot, restoreSnapshot])

  const closeTab = useCallback((id: string) => {
    const { activeTabId: curTabId, tabs: curTabs, activeReq: curReq } = tabValsRef.current
    const filtered = curTabs.filter(t => t.id !== id)
    if (filtered.length === 0) {
      setTabs([])
      setActiveTabId('')
      setActiveReq(null); setIsDraft(false); setDraftColId(null); setDraftFolderId(null)
      setReqName('New Request'); setMethod('GET'); setUrl('')
      setParams([]); setHeaders([...DEFAULT_HEADERS]); setBody({ ...EMPTY_BODY, formData: [] }); setAuth({ ...EMPTY_AUTH })
      setPreRequestScript(''); setPostRequestScript(''); setTempVars({})
      setVarOverrides({})
      setResponse(null); setSendError(null); setRequestTiming(null)
      setPreScriptResult(null); setPostScriptResult(null); setIsSending(false)
      return
    }
    if (id === curTabId) {
      const oldIdx = curTabs.findIndex(t => t.id === id)
      const newActive = filtered[Math.min(oldIdx, filtered.length - 1)]
      setActiveTabId(newActive.id)
      restoreSnapshot(newActive.snapshot ?? mkBlankSnapshot())
    }
    setTabs(filtered)
    void curReq // keep linter happy — curReq's ref is read to avoid stale closure
  }, [restoreSnapshot])

  const addTabAndActivate = useCallback((meta: RequestTabMeta, snapshot: TabSnapshot) => {
    const { activeTabId: curTabId, reqName: curName, method: curMethod, activeReq: curReq } = tabValsRef.current
    const currentSnapshot = captureSnapshot()
    setTabs(prev => [
      ...prev.map(t => t.id === curTabId
        ? { ...t, label: curName, method: curMethod, savedReqId: curReq?.id ?? null, snapshot: currentSnapshot }
        : t
      ),
      meta,
    ])
    setActiveTabId(meta.id)
    restoreSnapshot(snapshot)
  }, [captureSnapshot, restoreSnapshot])

  const newTab = useCallback(() => {
    const { meta, snapshot } = TabFactory.blank()
    addTabAndActivate(meta, snapshot)
  }, [addTabAndActivate])

  const openInTab = useCallback((req: SavedRequest) => {
    const existing = tabValsRef.current.tabs.find(t => t.savedReqId === req.id)
    if (existing) { switchToTab(existing.id); return }
    const { meta, snapshot } = TabFactory.fromRequest(req)
    addTabAndActivate(meta, snapshot)
  }, [switchToTab, addTabAndActivate])

  const openHistoryInTab = useCallback((h: HistoryEntry) => {
    const { meta, snapshot } = TabFactory.fromHistory(h)
    addTabAndActivate(meta, snapshot)
  }, [addTabAndActivate])

  const handleRequestsRemoved = useCallback((shouldDemote: (req: SavedRequest) => boolean) => {
    const { activeReq: curReq, activeTabId: curTabId } = tabValsRef.current
    if (curReq && shouldDemote(curReq)) {
      setActiveReq(null); setIsDraft(true); setDraftColId(null); setDraftFolderId(null)
    }
    setTabs(prev => prev.map(t => {
      let updated = t
      if (updated.id === curTabId && curReq && shouldDemote(curReq)) {
        updated = { ...updated, savedReqId: null }
      }
      if (updated.snapshot?.activeReq && shouldDemote(updated.snapshot.activeReq)) {
        updated = { ...updated, savedReqId: null, snapshot: { ...updated.snapshot, activeReq: null, isDraft: true, draftColId: null, draftFolderId: null } }
      }
      return updated
    }))
  }, [])

  const saveRequest = useCallback(async (overrideColId?: string, overrideFolderId?: string | null) => {
    const {
      isDraft: curIsDraft, activeReq: curReq, draftColId: curDraftColId, draftFolderId: curDraftFolderId,
      reqName: curName, method: curMethod, url: curUrl, params: curParams, headers: curHeaders,
      body: curBody, auth: curAuth, preRequestScript: curPre, postRequestScript: curPost, activeTabId: curTabId,
    } = execRef.current
    const resolvedColId = overrideColId ?? curDraftColId
    const resolvedFolderId = overrideFolderId !== undefined ? overrideFolderId : curDraftFolderId
    if (curIsDraft && !curReq && !resolvedColId) {
      setSaveToColModal(true)
      return
    }
    setIsSaving(true); setSaveError('')
    const payload = { name: curName, method: curMethod, url: curUrl, params: curParams, headers: curHeaders, body: curBody, auth: curAuth, preRequestScript: curPre, postRequestScript: curPost }
    try {
      if (curIsDraft && resolvedColId) {
        const { request } = await apiFetch<{ request: SavedRequest }>('/api/requests', { method: 'POST', body: JSON.stringify({ ...payload, collectionId: resolvedColId, folderId: resolvedFolderId ?? undefined }) })
        setRequestsByCol(prev => ({ ...prev, [resolvedColId]: [...(prev[resolvedColId] ?? []), request] }))
        setActiveReq(request); setIsDraft(false); setDraftColId(null); setDraftFolderId(null)
        setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, savedReqId: request.id, label: request.name, method: request.method } : t))
      } else if (curReq) {
        const { request } = await apiFetch<{ request: SavedRequest }>(`/api/requests/${curReq.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        setRequestsByCol(prev => ({ ...prev, [request.collectionId]: (prev[request.collectionId] ?? []).map(r => r.id === request.id ? request : r) }))
        setActiveReq(request)
        setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, label: request.name, method: request.method } : t))
      }
      setSaveFlash(true)
      if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current)
      saveFlashTimerRef.current = setTimeout(() => { setSaveFlash(false); saveFlashTimerRef.current = null }, 1500)
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, dirty: false } : t))
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Failed to save request') }
    finally { setIsSaving(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setRequestsByCol is a stable useState dispatcher passed as a prop
  }, [])

  const sendRequest = useCallback(async () => {
    const {
      url: curUrl, method: curMethod, params: curParams, headers: curHeaders, body: curBody, auth: curAuth,
      preRequestScript: curPre, postRequestScript: curPost, tempVars: curTempVars, varOverrides: curVarOverrides,
      activeTabId: curTabId, currentWs: curWs, currentEnvId: curEnvId, environments: curEnvs,
      sidebarSection: curSection, loadHistory: curLoadHistory,
    } = execRef.current

    if (!curUrl.trim()) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const sendTabId = curTabId
    setSendError(null); setIsSending(true); setResponse(null); setRequestTiming(null)
    setPreScriptResult(null); setPostScriptResult(null)
    const currentEnvObj = curEnvs.find(e => e.id === curEnvId)
    let envVars: Record<string, string> = {}
    currentEnvObj?.variables.filter(v => v.enabled && v.key).forEach(v => { envVars[v.key] = v.value })
    let sessionTempVars = curTempVars

    const applyEnvUpdate = (updated: Record<string, string>) => {
      if (!currentEnvObj) return
      setEnvironments(prev => prev.map(e => {
        if (e.id !== currentEnvObj.id) return e
        const disabledVars = e.variables.filter(v => !v.enabled && !(v.key in updated))
        const updatedVars: EnvVar[] = Object.entries(updated).map(([key, value]) => {
          const existing = e.variables.find(v => v.key === key)
          return { key, value, enabled: true, secret: existing?.secret ?? false }
        })
        return { ...e, variables: [...disabledVars, ...updatedVars] }
      }))
    }

    try {
      if (curPre.trim()) {
        const result = await runScript(curPre, {
          envVars,
          tempVars: sessionTempVars,
          request: {
            url: curUrl,
            method: curMethod,
            headers: Object.fromEntries(curHeaders.filter(h => h.enabled && h.key).map(h => [h.key, h.value])),
          },
        })
        setPreScriptResult(result)
        envVars = result.envVars
        sessionTempVars = result.tempVars
        setTempVars(result.tempVars)
        applyEnvUpdate(result.envVars)
      }

      const { activeReq: curReq } = execRef.current
      const raw = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: curMethod, url: curUrl, params: curParams, headers: curHeaders, body: curBody, auth: curAuth,
          environmentVariables: envVars,
          tempVariables: { ...sessionTempVars, ...curVarOverrides },
          requestId: curReq?.id,
          workspaceId: curWs?.id,
          environmentId: curEnvId !== 'none' ? curEnvId : undefined,
        }),
        signal: controller.signal,
      })
      const data = await raw.json()

      if (!raw.ok) {
        const errMsg = data?.error ?? raw.statusText
        const errResponse = {
          status: raw.status, statusText: raw.statusText, headers: {},
          body: JSON.stringify({ error: errMsg }, null, 2), durationMs: 0, size: 0,
        }
        if (activeTabIdRef.current !== sendTabId) {
          setTabs(prev => prev.map(t => {
            if (t.id !== sendTabId) return t
            const base = t.snapshot ?? mkBlankSnapshot()
            return { ...t, snapshot: { ...base, response: errResponse, responseTab: 'Pretty' as const, isSending: false, sendError: null } }
          }))
          return
        }
        setResponse(errResponse)
        setResponseTab('Pretty')
        return
      }

      const res = data as ExecResponse
      const timing = {
        dns: Math.round(res.durationMs * 0.05),
        connect: Math.round(res.durationMs * 0.1),
        tls: Math.round(res.durationMs * 0.1),
        firstByte: Math.round(res.durationMs * 0.55),
        download: Math.round(res.durationMs * 0.2),
        total: res.durationMs,
      }
      if (activeTabIdRef.current !== sendTabId) {
        setTabs(prev => prev.map(t => {
          if (t.id !== sendTabId) return t
          const base = t.snapshot ?? mkBlankSnapshot()
          return { ...t, snapshot: { ...base, response: res, responseTab: 'Pretty' as const, requestTiming: timing, isSending: false, sendError: null } }
        }))
      } else {
        setResponse(res); setResponseTab('Pretty')
        setRequestTiming(timing)
      }

      if (curPost.trim()) {
        const result = await runScript(curPost, {
          envVars,
          tempVars: sessionTempVars,
          response: {
            status: res.status, statusText: res.statusText,
            headers: res.headers, body: res.body,
          },
        })
        sessionTempVars = result.tempVars
        applyEnvUpdate(result.envVars)
        if (activeTabIdRef.current === sendTabId) {
          setPostScriptResult(result)
          setTempVars(result.tempVars)
        } else {
          setTabs(prev => prev.map(t => {
            if (t.id !== sendTabId) return t
            const base = t.snapshot ?? mkBlankSnapshot()
            return { ...t, snapshot: { ...base, postScriptResult: result, tempVars: result.tempVars } }
          }))
        }
      }

      if (curSection === 'history') curLoadHistory()
    } catch (e) {
      if (controller.signal.aborted) return
      const errMsg = e instanceof Error ? e.message : 'Request failed'
      if (activeTabIdRef.current !== sendTabId) {
        setTabs(prev => prev.map(t => {
          if (t.id !== sendTabId) return t
          const base = t.snapshot ?? mkBlankSnapshot()
          return { ...t, snapshot: { ...base, isSending: false, sendError: errMsg } }
        }))
      } else {
        setSendError(errMsg)
      }
    }
    finally { if (!controller.signal.aborted && activeTabIdRef.current === sendTabId) setIsSending(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setEnvironments/setRequestsByCol are stable useState dispatchers passed as props
  }, [])

  const isDirty = tabs.find(t => t.id === activeTabId)?.dirty ?? isDraft

  return {
    activeReq, setActiveReq,
    isDraft, setIsDraft,
    draftColId, setDraftColId,
    draftFolderId, setDraftFolderId,
    reqName, setReqName,
    method, setMethod,
    url, setUrl,
    params, setParams,
    headers, setHeaders,
    body, setBody,
    auth, setAuth,
    activeTab, setActiveTab,
    preRequestScript, setPreRequestScript,
    postRequestScript, setPostRequestScript,
    tempVars, setTempVars,
    varOverrides, setVarOverride,
    preScriptResult, postScriptResult,
    tabs, setTabs,
    activeTabId, setActiveTabId,
    tabBarRef,
    response, responseTab, setResponseTab,
    isSending, sendError, requestTiming,
    isSaving, saveFlash, saveError, setSaveError,
    isDirty,
    saveToColModal, setSaveToColModal,
    switchToTab, closeTab, newTab,
    openInTab, openHistoryInTab,
    handleRequestsRemoved,
    saveRequest, sendRequest,
  }
}
