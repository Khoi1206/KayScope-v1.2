'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import type { ExecResponse } from './types'
import { formatBytes, statusColor, statusBg } from './utils'
import { SyntaxHighlight } from './SyntaxHighlight'

interface ResponsePanelProps {
  response: ExecResponse | null
  responseTab: 'Pretty' | 'Headers' | 'Cookies' | 'Timing' | 'Raw'
  setResponseTab: (tab: 'Pretty' | 'Headers' | 'Cookies' | 'Timing' | 'Raw') => void
  isSending: boolean
  sendError: string | null
  requestTiming: { dns: number; connect: number; tls: number; firstByte: number; download: number; total: number } | null
}

export const ResponsePanel = memo(function ResponsePanel({ response, responseTab, setResponseTab, isSending, sendError, requestTiming }: ResponsePanelProps) {
  const t = useTranslations()
  return (
    <div className="border-t border-th-border flex flex-col" style={{ height: '40%', minHeight: '180px' }}>
      {/* Response header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-th-border shrink-0">
        <span className="text-xs text-th-text-3 font-medium">{t('response.title')}</span>
        {response && (
          <>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${statusBg(response.status)} ${statusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-xs text-gray-500">{response.durationMs}ms</span>
            <span className="text-xs text-gray-500">{formatBytes(response.size)}</span>
          </>
        )}
        {isSending && <span role="status" className="text-xs text-orange-400 animate-pulse">{t('response.sending')}</span>}
        {sendError && <span role="alert" className="text-xs text-red-400">{sendError}</span>}
        <div className="flex-1" />
        {response && (
          <div role="tablist" className="flex items-center gap-0.5">
            {(['Pretty', 'Headers', 'Cookies', 'Timing', 'Raw'] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={responseTab === tab}
                type="button"
                onClick={() => setResponseTab(tab)}
                className={`text-xs px-2 py-1 rounded transition ${responseTab === tab ? 'bg-th-input text-th-text-2' : 'text-th-text-3 hover:text-th-text-2'}`}
              >
                {t(`response.tab${tab}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Response body */}
      <div className="flex-1 overflow-auto p-4">
        {/* Pretty */}
        {response && responseTab === 'Pretty' && (
          <>
            {response.body.length > 500_000 && (
              <p className="text-[10px] text-yellow-500 mb-2">{t('response.truncated')}</p>
            )}
            <SyntaxHighlight json={response.body.length > 500_000 ? response.body.slice(0, 500_000) + '\n… (truncated)' : response.body} />
          </>
        )}

        {/* Raw */}
        {response && responseTab === 'Raw' && (
          <pre className="text-xs text-th-text-2 whitespace-pre-wrap break-all font-mono">{response.body}</pre>
        )}

        {/* Headers */}
        {response && responseTab === 'Headers' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-th-text-3 border-b border-th-border">
                <th scope="col" className="text-left pb-2 font-medium">{t('response.headerName')}</th>
                <th scope="col" className="text-left pb-2 pl-4 font-medium">{t('response.headerValue')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(response.headers).map(([k, v]) => (
                <tr key={k} className="border-b border-th-border/40">
                  <td className="py-1.5 text-purple-400 font-mono">{k}</td>
                  <td className="py-1.5 pl-4 text-gray-300 break-all font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Cookies */}
        {response && responseTab === 'Cookies' && (() => {
          const setCookieHeader = Object.entries(response.headers).find(([k]) => k.toLowerCase() === 'set-cookie')
          const cookies = setCookieHeader ? setCookieHeader[1].split(/,(?=\s*\w+=)/).map(c => {
            const parts = c.trim().split(';').map(p => p.trim())
            const [nameVal, ...attrs] = parts
            const [name, ...valParts] = nameVal.split('=')
            return { name, value: valParts.join('='), attributes: attrs }
          }) : []
          return cookies.length > 0 ? (
            <table className="w-full text-xs">
              <thead><tr className="text-th-text-3 border-b border-th-border">
                <th scope="col" className="text-left pb-2 font-medium">{t('response.cookieName')}</th>
                <th scope="col" className="text-left pb-2 pl-4 font-medium">{t('response.cookieValue')}</th>
                <th scope="col" className="text-left pb-2 pl-4 font-medium">{t('response.cookieAttributes')}</th>
              </tr></thead>
              <tbody>{cookies.map((c, i) => (
                <tr key={i} className="border-b border-th-border/40">
                  <td className="py-1.5 text-orange-400 font-mono">{c.name}</td>
                  <td className="py-1.5 pl-4 text-gray-300 break-all font-mono">{c.value}</td>
                  <td className="py-1.5 pl-4 text-gray-500 text-[10px]">{c.attributes.join('; ')}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-xs text-gray-600">{t('response.noCookies')}</p>
        })()}

        {/* Timing */}
        {response && responseTab === 'Timing' && requestTiming && (
          <div className="space-y-3 max-w-md">
            <p className="text-[10px] text-th-text-3 italic">{t('response.timingNote')}</p>
            {[
              { label: t('response.timingDns'), value: requestTiming.dns, color: 'bg-cyan-500' },
              { label: t('response.timingConnect'), value: requestTiming.connect, color: 'bg-blue-500' },
              { label: t('response.timingTls'), value: requestTiming.tls, color: 'bg-purple-500' },
              { label: t('response.timingTtfb'), value: requestTiming.firstByte, color: 'bg-green-500' },
              { label: t('response.timingDownload'), value: requestTiming.download, color: 'bg-yellow-500' },
            ].map(row => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-th-text-3">{row.label}</span>
                  <span className="text-th-text-2 font-mono">{row.value}ms</span>
                </div>
                <div className="h-2 bg-th-input rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${Math.max(2, (row.value / requestTiming.total) * 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs pt-2 border-t border-th-border">
              <span className="text-th-text-2 font-medium">{t('response.timingTotal')}</span>
              <span className="text-orange-400 font-bold font-mono">{requestTiming.total}ms</span>
            </div>
          </div>
        )}

        {!response && !isSending && !sendError && (
          <span className="text-th-text-3 text-xs">{t('response.hitSend')}</span>
        )}
      </div>
    </div>
  )
})
