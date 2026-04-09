'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { CodePreview } from '@/app/test-builder/components/CodePreview'
import { ResultsPanel } from '@/app/test-builder/components/ResultsPanel'
import type { RunResult } from '@/app/test-builder/types'

// Blockly is browser-only
const BlocklyEditor = dynamic(
  () => import('@/app/test-builder/components/BlocklyEditor').then((m) => m.BlocklyEditor),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-gray-500 text-sm">Loading visual editor…</div> }
)

/**
 * Embeddable Test Builder — renders inside the AppShell main content area.
 * Same Blockly workspace + code preview + results panel as the standalone page,
 * but without its own nav header (the AppShell header is used instead).
 */
export function TestBuilderPanel({
  initialBlocklyState,
  onBlocklyStateChange,
  workspaceId,
  canGoBack,
  onGoBack,
}: {
  initialBlocklyState?: object
  onBlocklyStateChange?: (state: object) => void
  workspaceId?: string
  canGoBack?: boolean
  onGoBack?: () => void
}) {
  const t = useTranslations('testBuilder')
  const [code, setCode] = useState('')
  const [testCount, setTestCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [openingUi, setOpeningUi] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  /* Local ref to always have current blockly state when saving a run */
  const blocklyStateRef = useRef<object | undefined>(initialBlocklyState)

  const handleCodeChange = useCallback((newCode: string, count: number) => {
    setCode(newCode)
    setTestCount(count)
  }, [])

  const handleOpenUI = async () => {
    setOpeningUi(true)
    setError(null)
    try {
      const res = await fetch('/api/playwright/ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: testCount > 0 ? code : '' }),
      })
      const data = await res.json()
      if (!data.ok) setError(data.error ?? 'Failed to open Playwright UI')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setOpeningUi(false)
    }
  }

  const handleRun = async () => {
    if (!code.trim() || testCount === 0) {
      setError(t('noTestError'))
      return
    }
    setError(null)
    setRunning(true)
    setResult(null)

    try {
      const res = await fetch('/api/playwright/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`)
      } else {
        const runResult = data as RunResult
        setResult(runResult)
        const nameMatch = code.match(/test\(`([^`]+)`/)
        const testName = nameMatch?.[1] ?? 'Unnamed Test'
        if (workspaceId) {
          fetch('/api/test-runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              name: testName,
              code,
              blocklyState: blocklyStateRef.current,
              result: runResult,
              savedAt: new Date().toISOString(),
            }),
          })
            .then(() => window.dispatchEvent(new Event('kayscope_runs_updated')))
            .catch(() => {})
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">

      {/* ── Slim toolbar ──────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-800 bg-[#111111] px-4 py-2">
        <span className="text-xs font-semibold text-gray-300">🎭 {t('title')}</span>
        <span className="mx-1 text-gray-700">·</span>
        <span className="text-xs text-gray-500">
          {testCount !== 1 ? t('testsPlural', { count: testCount }) : t('tests', { count: testCount })} · {t('lines', { count: code.split('\n').length })}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Back to previous workspace */}
          {canGoBack && onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              title={t('backTitle')}
              className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800/60 px-2.5 py-1
                text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
            >
              {t('back')}
            </button>
          )}
          {/* Run button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={running || testCount === 0}
            className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white
              hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {running ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                {t('running')}
              </>
            ) : (
              t('run')
            )}
          </button>

          {/* Open UI */}
          <button
            type="button"
            onClick={handleOpenUI}
            disabled={openingUi}
            title={t('openUiTitle')}
            className="flex items-center gap-1.5 rounded border border-purple-700 bg-purple-900/40 px-3 py-1
              text-xs font-medium text-purple-300 hover:bg-purple-800/60 hover:text-purple-100
              disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {openingUi ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-purple-300 border-t-transparent" />
                {t('opening')}
              </>
            ) : (
              t('openUi')
            )}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-gray-700 px-2.5 py-1 text-xs text-gray-400
              hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            {t('reset')}
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="shrink-0 border-b border-red-700 bg-red-900/50 px-4 py-1.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* ── Body: Blockly left, code+results right ────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* Blockly workspace */}
        <div className="relative min-w-0 flex-1 border-r border-gray-800">
          <div className="absolute inset-0">
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              initialState={initialBlocklyState}
              onStateChange={s => { blocklyStateRef.current = s; onBlocklyStateChange?.(s) }}
            />
          </div>
          {testCount === 0 && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl bg-gray-900/80 p-5 text-center max-w-xs backdrop-blur">
                <p className="text-xl mb-1.5">🧩</p>
                <p className="text-xs font-medium text-gray-300 mb-1">{t('emptyHeading')}</p>
                <p className="text-[11px] text-gray-500">{t('emptyHint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: code preview + results */}
        <div className="flex w-80 shrink-0 flex-col border-l border-gray-800 xl:w-96">
          {/* Code preview — top half */}
          <div className="min-h-0 flex-1 overflow-hidden border-b border-gray-800 bg-gray-900/50">
            <CodePreview code={code} testCount={testCount} />
          </div>
          {/* Results panel — bottom half */}
          <div className="min-h-0 flex-1 overflow-hidden bg-gray-950">
            <ResultsPanel result={result} running={running} />
          </div>
        </div>
      </div>
    </div>
  )
}
