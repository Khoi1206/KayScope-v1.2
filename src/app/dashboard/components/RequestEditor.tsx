'use client'

import { memo, useState, useRef, useMemo, useEffect } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type {
  HttpMethod, KV, ReqBody, ReqAuth,
  RawBodyType, ScriptResult, RequestEditorTab,
} from './types'
import {
  HTTP_METHODS, METHOD_COLOR, EMPTY_KV,
} from './constants'
import { KVEditor } from './KVEditor'
import { ScriptEditor } from './ScriptEditor'
import {
  getVarAtCursor, renderHighlightedUrl, extractVars, resolveVar,
} from './url-vars'

interface RequestEditorMetaProps {
  reqName: string
  setReqName: (v: string) => void
  method: HttpMethod
  setMethod: (v: HttpMethod) => void
  url: string
  setUrl: (v: string) => void
}

interface RequestEditorVarProps {
  envVars: Record<string, string>
  tempVars: Record<string, string>
  varOverrides: Record<string, string>
  onSetVarOverride: (name: string, value: string) => void
}

interface RequestEditorSaveProps {
  saveRequest: () => void
  sendRequest: () => void
  isSaving: boolean
  saveFlash: boolean
  isDirty: boolean
  saveError: string
  setSaveError: (v: string) => void
  isSending: boolean
}

interface RequestEditorContentProps {
  activeTab: RequestEditorTab
  setActiveTab: (t: RequestEditorTab) => void
  params: KV[]
  setParams: (v: KV[]) => void
  headers: KV[]
  setHeaders: (v: KV[]) => void
  body: ReqBody
  setBody: React.Dispatch<React.SetStateAction<ReqBody>>
  auth: ReqAuth
  setAuth: React.Dispatch<React.SetStateAction<ReqAuth>>
}

interface RequestEditorScriptProps {
  preRequestScript: string
  setPreRequestScript: (v: string) => void
  postRequestScript: string
  setPostRequestScript: (v: string) => void
  preScriptResult: ScriptResult | null
  postScriptResult: ScriptResult | null
}

type RequestEditorProps =
  RequestEditorMetaProps &
  RequestEditorVarProps &
  RequestEditorSaveProps &
  RequestEditorContentProps &
  RequestEditorScriptProps


export const RequestEditor = memo(function RequestEditor(props: RequestEditorProps) {
  const {
    reqName, setReqName, method, setMethod, url, setUrl,
    saveRequest, sendRequest, isSaving, saveFlash, isDirty, saveError, setSaveError, isSending,
    activeTab, setActiveTab,
    params, setParams, headers, setHeaders,
    body, setBody, auth, setAuth,
    preRequestScript, setPreRequestScript, postRequestScript, setPostRequestScript,
    preScriptResult, postScriptResult,
    envVars, tempVars,
    varOverrides, onSetVarOverride,
  } = props

  const resolveVarsHelper = (text: string): { resolved: string; hasUnresolved: boolean } | null => {
    if (!text.includes('{')) return null
    const resolved = text.replace(/\{\{(\w+)\}\}|(?<!\{)\{(\w+)\}(?!\})/g, (match, doubleVar, singleVar) => {
      if (doubleVar !== undefined) {
        const { value, source } = resolveVar(doubleVar, tempVars, varOverrides)
        return source !== 'none' ? value : match
      }
      return singleVar !== undefined && singleVar in envVars ? envVars[singleVar] : match
    })
    const hasUnresolved = /\{\{?\w+\}?\}/.test(resolved)
    return { resolved, hasUnresolved }
  }

  const varHint = (v: string) => {
    const result = resolveVarsHelper(v)
    if (!result) return null
    return (
      <p className={`mt-1 text-[10px] font-mono break-all ${result.hasUnresolved ? 'text-yellow-600/80' : 'text-gray-500'}`} title={result.resolved}>
        → {result.resolved}
      </p>
    )
  }

  /* ── Variable tooltip state ── */
  const [activeVar, setActiveVar] = useState<string | null>(null)
  const [activeVarIn, setActiveVarIn] = useState<'url' | 'auth' | 'kv' | null>(null)
  const [showVarList, setShowVarList] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlHighlightRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Cleanup any pending blur timer on unmount */
  useEffect(() => () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current) }, [])

  /* Ctrl+S — save request when there are unsaved changes */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) saveRequest()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, isSaving, saveRequest])

  const urlVars = useMemo(() => extractVars(url), [url])
  const activeVarInfo = useMemo(
    () => (activeVar ? resolveVar(activeVar, tempVars, varOverrides) : null),
    [activeVar, tempVars, varOverrides]
  )

  const handleUrlCursor = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const pos = e.currentTarget.selectionStart ?? 0
    const found = getVarAtCursor(e.currentTarget.value, pos)
    setActiveVar(found)
    if (found) setShowVarList(false)
  }

  const handleUrlBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setActiveVar(null)
      setActiveVarIn(null)
      setShowVarList(false)
    }, 150)
  }

  const cancelBlur = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
  }

  const handleVarHover = (name: string) => {
    cancelBlur()
    setActiveVar(name)
    setActiveVarIn('url')
    setShowVarList(false)
  }

  const handleAuthVarHover = (name: string) => {
    cancelBlur()
    setActiveVar(name)
    setActiveVarIn('auth')
    setShowVarList(false)
  }

  const handleKvVarHover = (name: string) => {
    cancelBlur()
    setActiveVar(name)
    setActiveVarIn('kv')
    setShowVarList(false)
  }

  const handleVarHoverLeave = () => {
    blurTimerRef.current = setTimeout(() => {
      setActiveVar(null)
      setActiveVarIn(null)
      setShowVarList(false)
    }, 200)
  }

  const handleVarSpanMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    inputRef.current?.focus()
  }

  const handleUrlScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (urlHighlightRef.current) urlHighlightRef.current.scrollLeft = e.currentTarget.scrollLeft
  }

  const kvVarPopup = activeVarIn === 'kv' && activeVar && activeVarInfo ? (
    <div onMouseDown={cancelBlur} onMouseEnter={cancelBlur} onMouseLeave={handleVarHoverLeave} className="absolute top-full left-0 mt-1 z-50 bg-th-surface border border-th-border-soft rounded-lg shadow-2xl min-w-[260px] max-w-[400px] overflow-hidden">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs flex-1 truncate">
            {activeVarInfo.source !== 'none' ? <span className="text-gray-200">{activeVarInfo.value || <span className="italic text-gray-500">(empty string)</span>}</span> : <span className="italic text-gray-500">not set</span>}
          </span>
        </div>
        <div className="mt-1.5">
          {activeVarInfo.source === 'override' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">O</span>Override</span>}
          {activeVarInfo.source === 'temp' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">V</span>Script Variable</span>}
          {activeVarInfo.source === 'none' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">?</span>Not set</span>}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
          <input value={varOverrides[activeVar] ?? ''} onChange={e => onSetVarOverride(activeVar, e.target.value)} onMouseDown={cancelBlur} placeholder="Set temporary value…" className="flex-1 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono min-w-0" />
          {varOverrides[activeVar] !== undefined && varOverrides[activeVar] !== '' && (<button onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(activeVar, '') }} className="text-gray-600 hover:text-gray-300 transition shrink-0" title="Clear override"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-th-border shrink-0">
        <input value={reqName} onChange={e => { setReqName(e.target.value); setSaveError('') }}
          className="flex-1 bg-transparent text-sm text-th-text-2 font-medium focus:outline-none placeholder-th-text-3 min-w-0" placeholder="Request name" />
        {saveError && <span className="text-xs text-red-400 shrink-0">{saveError}</span>}
        <button onClick={() => saveRequest()} disabled={isSaving || (!isDirty && !saveFlash)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition ${saveFlash ? 'bg-green-600 text-white' : saveError ? 'bg-red-600/20 text-red-400 border border-red-500/30' : isDirty ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'} disabled:opacity-50`}>
          {saveFlash ? 'Saved!' : isSaving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-3 border-b border-th-border shrink-0">
        <div className="flex items-center gap-2">
          <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
            <SelectTrigger className={`bg-th-input border border-th-border-soft rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:ring-0 focus:border-orange-500 hover:border-th-border transition w-[105px] ${METHOD_COLOR[method]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-th-surface border-th-border-soft w-32">
              {HTTP_METHODS.map(m => (
                <SelectItem key={m} value={m} className={`text-xs font-bold cursor-pointer ${METHOD_COLOR[m]}`}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* URL input wrapper — relative so the popup can be positioned below it */}
          <div className="relative flex-1 bg-th-input rounded-md">
            <div
              ref={urlHighlightRef}
              aria-hidden
              className="absolute inset-0 z-10 px-3 py-2 text-sm font-mono text-th-text pointer-events-none overflow-hidden whitespace-pre rounded-md"
            >
              {renderHighlightedUrl(url, handleVarHover, handleVarHoverLeave, handleVarSpanMouseDown)}
            </div>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendRequest()}
              onClick={handleUrlCursor}
              onKeyUp={handleUrlCursor}
              onSelect={handleUrlCursor}
              onBlur={handleUrlBlur}
              onScroll={handleUrlScroll}
              placeholder="Enter request URL"
              style={{ caretColor: 'var(--th-text)' }}
              className="relative w-full bg-transparent border border-th-border-soft rounded-md px-3 py-2 text-sm text-transparent placeholder-th-text-3 focus:outline-none focus:border-orange-500 font-mono selection:bg-blue-500/30"
            />

            {(activeVarIn === 'url') && (activeVar || showVarList) && (urlVars.length > 0 || activeVar) && (
              <div
                onMouseDown={cancelBlur}
                onMouseEnter={cancelBlur}
                onMouseLeave={handleVarHoverLeave}
                onFocus={cancelBlur}
                className="absolute top-full left-0 mt-1 z-50 bg-th-surface border border-th-border-soft rounded-lg shadow-2xl min-w-[260px] max-w-[480px] overflow-hidden"
              >
                {activeVar && activeVarInfo && (
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs flex-1 truncate">
                        {activeVarInfo.source !== 'none'
                          ? <span className="text-gray-200">{activeVarInfo.value || <span className="italic text-gray-500">(empty string)</span>}</span>
                          : <span className="italic text-gray-500">not set</span>
                        }
                      </span>
                      <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <div>
                        {activeVarInfo.source === 'override' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">
                            <span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">O</span>
                            Override
                          </span>
                        )}
                        {activeVarInfo.source === 'temp' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">V</span>
                            Script Variable
                          </span>
                        )}
                        {activeVarInfo.source === 'none' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium">
                            <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">?</span>
                            Not set
                          </span>
                        )}
                      </div>
                      {urlVars.length > 0 && (
                        <button
                          onMouseDown={e => { e.preventDefault(); cancelBlur(); setShowVarList(v => !v); setActiveVar(null) }}
                          className="text-[10px] text-orange-400 hover:text-orange-300 transition whitespace-nowrap"
                        >
                          Variables in request →
                        </button>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
                      <input
                        value={varOverrides[activeVar] ?? ''}
                        onChange={e => onSetVarOverride(activeVar, e.target.value)}
                        onMouseDown={cancelBlur}
                        placeholder="Set temporary value…"
                        className="flex-1 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono min-w-0"
                      />
                      {varOverrides[activeVar] !== undefined && varOverrides[activeVar] !== '' && (
                        <button
                          onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(activeVar, '') }}
                          className="text-gray-600 hover:text-gray-300 transition shrink-0"
                          title="Clear override"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {showVarList && urlVars.length > 0 && (
                  <div className={activeVar ? 'border-t border-gray-700/60' : ''}>
                    <div className="px-3 py-1.5 flex items-center justify-between bg-gray-800/40">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Variables in request</span>
                      <button
                        onMouseDown={e => { e.preventDefault(); cancelBlur(); setShowVarList(false) }}
                        className="text-gray-600 hover:text-gray-400 transition"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {urlVars.map(name => {
                      const info = resolveVar(name, tempVars, varOverrides)
                      return (
                        <div key={name} className="px-3 py-2 hover:bg-gray-800/50 border-b border-gray-800/40 last:border-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-orange-400 text-xs shrink-0">{'{{' + name + '}}'}</span>
                            {info.source === 'override' && <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 shrink-0 ml-auto">OVERRIDE</span>}
                            {info.source === 'temp' && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/15 text-purple-400 shrink-0 ml-auto">VAR</span>}
                            {info.source === 'none' && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-600 shrink-0 ml-auto">—</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              value={varOverrides[name] ?? ''}
                              onChange={e => onSetVarOverride(name, e.target.value)}
                              onMouseDown={cancelBlur}
                              placeholder={info.source !== 'none' && info.source !== 'override' ? (info.value || '(empty)') : 'Set temporary value…'}
                              className="flex-1 bg-gray-800/70 border border-gray-700/60 rounded px-2 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400 font-mono min-w-0"
                            />
                            {varOverrides[name] !== undefined && varOverrides[name] !== '' && (
                              <button
                                onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(name, '') }}
                                className="text-gray-600 hover:text-gray-300 transition shrink-0"
                                title="Clear override"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={sendRequest} disabled={isSending || !url.trim()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-md text-sm transition shrink-0">
            {isSending ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : 'Send'}
          </button>
        </div>
      </div>

      <div className="flex border-b border-th-border px-4 shrink-0">
        {(['Params', 'Headers', 'Body', 'Authorization', 'Pre-request', 'Post-request'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition ${activeTab === tab ? 'text-orange-400 border-orange-500' : 'text-th-text-3 border-transparent hover:text-th-text-2'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'Params' && <KVEditor rows={params} onChange={setParams} resolveVars={resolveVarsHelper} onVarHover={handleKvVarHover} onVarLeave={handleVarHoverLeave} activeVar={activeVarIn === 'kv' ? activeVar : null} varPopup={kvVarPopup} />}
        {activeTab === 'Headers' && <KVEditor rows={headers} onChange={setHeaders} resolveVars={resolveVarsHelper} onVarHover={handleKvVarHover} onVarLeave={handleVarHoverLeave} activeVar={activeVarIn === 'kv' ? activeVar : null} varPopup={kvVarPopup} />}

        {activeTab === 'Body' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              {(['none', 'form-data', 'x-www-form-urlencoded', 'raw'] as const).map(t => (
                <label key={t} className="flex items-center gap-1 text-gray-400 cursor-pointer hover:text-gray-200">
                  <input type="radio" name="bodyType" value={t} checked={body.type === t}
                    onChange={() => setBody(b => ({ ...b, type: t, formData: b.formData?.length ? b.formData : [EMPTY_KV()] }))}
                    className="accent-orange-500" />
                  {t}
                </label>
              ))}
              {body.type === 'raw' && (
                <select value={body.rawType ?? 'json'}
                  onChange={e => setBody(b => ({ ...b, rawType: e.target.value as RawBodyType }))}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-orange-400 focus:outline-none focus:border-orange-500 ml-1">
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="javascript">JavaScript</option>
                  <option value="html">HTML</option>
                  <option value="xml">XML</option>
                </select>
              )}
            </div>
            {body.type === 'form-data' && (
              <KVEditor rows={body.formData ?? [EMPTY_KV()]} onChange={fd => setBody(b => ({ ...b, formData: fd }))} resolveVars={resolveVarsHelper} onVarHover={handleKvVarHover} onVarLeave={handleVarHoverLeave} activeVar={activeVarIn === 'kv' ? activeVar : null} varPopup={kvVarPopup} />
            )}
            {body.type === 'x-www-form-urlencoded' && (
              <KVEditor rows={body.formData ?? [EMPTY_KV()]} onChange={fd => setBody(b => ({ ...b, formData: fd }))} resolveVars={resolveVarsHelper} onVarHover={handleKvVarHover} onVarLeave={handleVarHoverLeave} activeVar={activeVarIn === 'kv' ? activeVar : null} varPopup={kvVarPopup} />
            )}
            {body.type === 'raw' && (
              <textarea value={body.content} onChange={e => setBody(b => ({ ...b, content: e.target.value }))}
                placeholder={(body.rawType ?? 'json') === 'json' ? '{\n  "key": "value"\n}' : 'Request body'} rows={10}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-y" />
            )}
          </div>
        )}

        {activeTab === 'Authorization' && (
          <div className="space-y-4 max-w-md text-xs">
            <div>
              <label className="text-gray-400 block mb-1.5">Auth type</label>
              <select value={auth.type} onChange={e => setAuth(a => ({ ...a, type: e.target.value as ReqAuth['type'] }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 focus:outline-none focus:border-orange-500 w-48">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api-key">API Key</option>
              </select>
            </div>
            {auth.type === 'bearer' && (
              <div>
                <label className="text-gray-400 block mb-1.5">Token</label>
                <div className="relative">
                  <div className="relative w-full bg-gray-800 border border-gray-700 rounded focus-within:border-orange-500 transition">
                    <div aria-hidden className="absolute inset-0 z-10 px-3 py-2 text-gray-200 font-mono pointer-events-none overflow-hidden whitespace-pre">{renderHighlightedUrl(auth.token ?? '', handleAuthVarHover, handleVarHoverLeave, handleVarSpanMouseDown)}</div>
                    <input value={auth.token ?? ''} onChange={e => setAuth(a => ({ ...a, token: e.target.value }))} onBlur={handleUrlBlur} placeholder="Bearer token or {{variable}}" style={{ caretColor: '#e5e7eb' }} className="relative w-full bg-transparent px-3 py-2 text-transparent placeholder-gray-600 focus:outline-none font-mono selection:bg-blue-500/30" />
                  </div>
                  {activeVarIn === 'auth' && activeVar && activeVarInfo && (
                    <div onMouseDown={cancelBlur} onMouseEnter={cancelBlur} onMouseLeave={handleVarHoverLeave} className="absolute top-full left-0 mt-1 z-50 bg-th-surface border border-th-border-soft rounded-lg shadow-2xl min-w-[260px] max-w-[400px] overflow-hidden">
                      <div className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs flex-1 truncate">
                            {activeVarInfo.source !== 'none' ? <span className="text-gray-200">{activeVarInfo.value || <span className="italic text-gray-500">(empty string)</span>}</span> : <span className="italic text-gray-500">not set</span>}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          {activeVarInfo.source === 'override' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">O</span>Override</span>}
                          {activeVarInfo.source === 'temp' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">V</span>Script Variable</span>}
                          {activeVarInfo.source === 'none' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">?</span>Not set</span>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
                          <input value={varOverrides[activeVar] ?? ''} onChange={e => onSetVarOverride(activeVar, e.target.value)} onMouseDown={cancelBlur} placeholder="Set temporary value…" className="flex-1 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono min-w-0" />
                          {varOverrides[activeVar] !== undefined && varOverrides[activeVar] !== '' && (<button onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(activeVar, '') }} className="text-gray-600 hover:text-gray-300 transition shrink-0" title="Clear override"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {varHint(auth.token ?? '')}
              </div>
            )}
            {auth.type === 'basic' && (
              <div className="space-y-2">
                <div>
                  <label className="text-gray-400 block mb-1.5">Username</label>
                  <div className="relative">
                    <div className="relative w-full bg-gray-800 border border-gray-700 rounded focus-within:border-orange-500 transition">
                      <div aria-hidden className="absolute inset-0 z-10 px-3 py-2 text-gray-200 pointer-events-none overflow-hidden whitespace-pre">{renderHighlightedUrl(auth.username ?? '', handleAuthVarHover, handleVarHoverLeave, handleVarSpanMouseDown)}</div>
                      <input value={auth.username ?? ''} onChange={e => setAuth(a => ({ ...a, username: e.target.value }))} onBlur={handleUrlBlur} placeholder="Username or {{variable}}" style={{ caretColor: '#e5e7eb' }} className="relative w-full bg-transparent px-3 py-2 text-transparent placeholder-gray-600 focus:outline-none selection:bg-blue-500/30" />
                    </div>
                    {activeVarIn === 'auth' && activeVar && activeVarInfo && (
                      <div onMouseDown={cancelBlur} onMouseEnter={cancelBlur} onMouseLeave={handleVarHoverLeave} className="absolute top-full left-0 mt-1 z-50 bg-th-surface border border-th-border-soft rounded-lg shadow-2xl min-w-[260px] max-w-[400px] overflow-hidden">
                        <div className="px-3 py-2.5">
                          <div className="flex items-center gap-2"><span className="font-mono text-xs flex-1 truncate">{activeVarInfo.source !== 'none' ? <span className="text-gray-200">{activeVarInfo.value || <span className="italic text-gray-500">(empty string)</span>}</span> : <span className="italic text-gray-500">not set</span>}</span></div>
                          <div className="mt-1.5">
                            {activeVarInfo.source === 'override' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">O</span>Override</span>}
                            {activeVarInfo.source === 'temp' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">V</span>Script Variable</span>}
                            {activeVarInfo.source === 'none' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">?</span>Not set</span>}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
                            <input value={varOverrides[activeVar] ?? ''} onChange={e => onSetVarOverride(activeVar, e.target.value)} onMouseDown={cancelBlur} placeholder="Set temporary value…" className="flex-1 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono min-w-0" />
                            {varOverrides[activeVar] !== undefined && varOverrides[activeVar] !== '' && (<button onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(activeVar, '') }} className="text-gray-600 hover:text-gray-300 transition shrink-0" title="Clear override"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {varHint(auth.username ?? '')}
                </div>
                <div>
                  <label className="text-gray-400 block mb-1.5">Password</label>
                  <input type="password" value={auth.password ?? ''} onChange={e => setAuth(a => ({ ...a, password: e.target.value }))} placeholder="Password or {{variable}}" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
            )}
            {auth.type === 'api-key' && (
              <div className="space-y-2">
                <div>
                  <label className="text-gray-400 block mb-1.5">Header name</label>
                  <input value={auth.apiKeyHeader ?? ''} onChange={e => setAuth(a => ({ ...a, apiKeyHeader: e.target.value }))} placeholder="X-API-Key" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1.5">Key</label>
                  <div className="relative">
                    <div className="relative w-full bg-gray-800 border border-gray-700 rounded focus-within:border-orange-500 transition">
                      <div aria-hidden className="absolute inset-0 z-10 px-3 py-2 text-gray-200 font-mono pointer-events-none overflow-hidden whitespace-pre">{renderHighlightedUrl(auth.apiKey ?? '', handleAuthVarHover, handleVarHoverLeave, handleVarSpanMouseDown)}</div>
                      <input value={auth.apiKey ?? ''} onChange={e => setAuth(a => ({ ...a, apiKey: e.target.value }))} onBlur={handleUrlBlur} placeholder="API key value or {{variable}}" style={{ caretColor: '#e5e7eb' }} className="relative w-full bg-transparent px-3 py-2 text-transparent placeholder-gray-600 focus:outline-none font-mono selection:bg-blue-500/30" />
                    </div>
                    {activeVarIn === 'auth' && activeVar && activeVarInfo && (
                      <div onMouseDown={cancelBlur} onMouseEnter={cancelBlur} onMouseLeave={handleVarHoverLeave} className="absolute top-full left-0 mt-1 z-50 bg-th-surface border border-th-border-soft rounded-lg shadow-2xl min-w-[260px] max-w-[400px] overflow-hidden">
                        <div className="px-3 py-2.5">
                          <div className="flex items-center gap-2"><span className="font-mono text-xs flex-1 truncate">{activeVarInfo.source !== 'none' ? <span className="text-gray-200">{activeVarInfo.value || <span className="italic text-gray-500">(empty string)</span>}</span> : <span className="italic text-gray-500">not set</span>}</span></div>
                          <div className="mt-1.5">
                            {activeVarInfo.source === 'override' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">O</span>Override</span>}
                            {activeVarInfo.source === 'temp' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">V</span>Script Variable</span>}
                            {activeVarInfo.source === 'none' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium"><span className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 inline-flex items-center justify-center text-[8px] text-white font-bold leading-none">?</span>Not set</span>}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
                            <input value={varOverrides[activeVar] ?? ''} onChange={e => onSetVarOverride(activeVar, e.target.value)} onMouseDown={cancelBlur} placeholder="Set temporary value…" className="flex-1 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono min-w-0" />
                            {varOverrides[activeVar] !== undefined && varOverrides[activeVar] !== '' && (<button onMouseDown={e => { e.preventDefault(); cancelBlur(); onSetVarOverride(activeVar, '') }} className="text-gray-600 hover:text-gray-300 transition shrink-0" title="Clear override"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {varHint(auth.apiKey ?? '')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Script editor tabs */}
        {(activeTab === 'Pre-request' || activeTab === 'Post-request') && (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {activeTab === 'Pre-request'
                ? 'Runs before the request is sent. Use pm.environment.set() and pm.variables.set() to inject dynamic values.'
                : 'Runs after the response. Use pm.response.json(), pm.test(), and pm.environment.set() to extract and assert values.'}
            </p>
            <ScriptEditor
              value={activeTab === 'Pre-request' ? preRequestScript : postRequestScript}
              onChange={activeTab === 'Pre-request' ? setPreRequestScript : setPostRequestScript}
            />
            {(() => {
              const r = activeTab === 'Pre-request' ? preScriptResult : postScriptResult
              if (!r || (!r.logs.length && !r.tests.length && !r.error)) return null
              return (
                <div className="border border-gray-700/60 rounded-md overflow-hidden">
                  <div className="bg-gray-800/60 px-3 py-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Script Console</div>
                  <div className="p-2 space-y-0.5 font-mono text-xs max-h-40 overflow-y-auto bg-gray-900/50">
                    {r.error && <div className="text-red-400">{'\u2716'} {r.error}</div>}
                    {r.tests.map((t, i) => (
                      <div key={i} className={t.passed ? 'text-emerald-400' : 'text-red-400'}>
                        {t.passed ? '\u2713' : '\u2716'} {t.name}{!t.passed && t.error ? ` — ${t.error}` : ''}
                      </div>
                    ))}
                    {r.logs.map((l, i) => (
                      <div key={i} className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}>
                        <span className="text-gray-600 mr-1">[{l.level}]</span>{l.message}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </>
  )
})
