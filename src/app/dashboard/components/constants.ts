import type { HttpMethod, KV, ReqBody, ReqAuth, TabSnapshot, RequestTabMeta, SavedRequest, HistoryEntry } from './types'

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: 'text-green-400', POST: 'text-yellow-400', PUT: 'text-blue-400',
  PATCH: 'text-purple-400', DELETE: 'text-red-400', HEAD: 'text-cyan-400', OPTIONS: 'text-gray-400',
}

export const EMPTY_KV = (): KV => ({ key: '', value: '', enabled: true, description: '' })

export const DEFAULT_HEADERS: KV[] = [
  { key: 'User-Agent', value: 'KayScope/1.1', enabled: true, description: '' },
  { key: 'Accept', value: '*/*', enabled: true, description: '' },
  { key: 'Connection', value: 'keep-alive', enabled: true, description: '' },
  { key: 'Cache-Control', value: 'no-cache', enabled: true, description: '' },
]

export const EMPTY_BODY: ReqBody = { type: 'none', content: '', rawType: 'json', formData: [] }
export const EMPTY_AUTH: ReqAuth = { type: 'none' }

export const mkBlankSnapshot = (): TabSnapshot => ({
  activeReq: null, isDraft: true, draftColId: null, draftFolderId: null,
  reqName: 'New Request', method: 'GET', url: '', params: [], headers: [...DEFAULT_HEADERS],
  body: { ...EMPTY_BODY }, auth: { ...EMPTY_AUTH }, activeTab: 'Params',
  preRequestScript: '', postRequestScript: '', tempVars: {},
  preScriptResult: null, postScriptResult: null,
  response: null, responseTab: 'Pretty', requestTiming: null, sendError: null, isSending: false,
  varOverrides: {},
})

/* ══════════════════════════════════════════════════════════════
   TabFactory — Factory Pattern
   Centralizes tab creation logic for all 3 tab origins:
   blank, saved request, and history entry.
   ══════════════════════════════════════════════════════════════ */

/** Normalize legacy body formats (json → raw) and ensure formData exists */
function prepareBody(raw: ReqBody | undefined): ReqBody {
  let b = { ...(raw ?? EMPTY_BODY), formData: [...(raw ?? EMPTY_BODY).formData ?? []] }
  if (b.type === 'json') b = { ...b, type: 'raw', rawType: 'json' }
  if (!b.rawType) b = { ...b, rawType: 'json' }
  if (!b.formData) b = { ...b, formData: [] }
  return b
}

export const TabFactory = {
  blank(): { meta: RequestTabMeta; snapshot: TabSnapshot } {
    return {
      meta: {
        id: 'tab-' + crypto.randomUUID(),
        label: 'New Request',
        method: 'GET',
        savedReqId: null,
        snapshot: null,
      },
      snapshot: mkBlankSnapshot(),
    }
  },

  fromRequest(req: SavedRequest): { meta: RequestTabMeta; snapshot: TabSnapshot } {
    const saved = req.headers ?? []
    const savedKeys = new Set(saved.map(h => h.key.toLowerCase()))
    return {
      meta: {
        id: 'tab-' + crypto.randomUUID(),
        label: req.name,
        method: req.method,
        savedReqId: req.id,
        snapshot: null,
      },
      snapshot: {
        activeReq: req, isDraft: false, draftColId: null, draftFolderId: null,
        reqName: req.name, method: req.method, url: req.url,
        params: req.params ?? [],
        headers: [...saved, ...DEFAULT_HEADERS.filter(d => !savedKeys.has(d.key.toLowerCase()))],
        body: prepareBody(req.body), auth: req.auth ?? EMPTY_AUTH,
        activeTab: 'Params',
        preRequestScript: req.preRequestScript ?? '', postRequestScript: req.postRequestScript ?? '',
        tempVars: {},
        preScriptResult: null, postScriptResult: null,
        response: null, responseTab: 'Pretty', requestTiming: null, sendError: null, isSending: false,
        varOverrides: {},
      },
    }
  },

  fromHistory(h: HistoryEntry): { meta: RequestTabMeta; snapshot: TabSnapshot } {
    let baseUrl = h.url
    const historyParams: KV[] = []
    try {
      const parsed = new URL(h.url.startsWith('http') ? h.url : `https://${h.url}`)
      baseUrl = parsed.origin + parsed.pathname
      parsed.searchParams.forEach((value, key) => {
        historyParams.push({ key, value, enabled: true, description: '' })
      })
    } catch { /* keep baseUrl = h.url, params empty */ }
    return {
      meta: {
        id: 'tab-' + crypto.randomUUID(),
        label: 'From History',
        method: h.method as HttpMethod,
        savedReqId: null,
        snapshot: null,
      },
      snapshot: {
        activeReq: null, isDraft: true, draftColId: null, draftFolderId: null,
        reqName: 'From History', method: h.method as HttpMethod, url: baseUrl,
        params: historyParams, headers: [...DEFAULT_HEADERS],
        body: { ...EMPTY_BODY, formData: [] }, auth: { ...EMPTY_AUTH },
        activeTab: 'Params',
        preRequestScript: '', postRequestScript: '', tempVars: {},
        preScriptResult: null, postScriptResult: null,
        response: { status: h.status, statusText: h.statusText, headers: h.responseHeaders, body: h.responseBody, durationMs: h.durationMs, size: h.size },
        responseTab: 'Pretty', requestTiming: null, sendError: null, isSending: false,
        varOverrides: {},
      },
    }
  },
}
