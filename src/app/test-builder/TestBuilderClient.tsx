'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { CodePreview } from './components/CodePreview'
import { ResultsPanel } from './components/ResultsPanel'
import type { RunResult } from './types'

// Blockly must render only in the browser — load with no SSR
const BlocklyEditor = dynamic(
  () => import('./components/BlocklyEditor').then((m) => m.BlocklyEditor),
  { ssr: false, loading: () => <BlocklyLoading /> }
)

function BlocklyLoading() {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <span className="text-sm">Loading visual editor…</span>
    </div>
  )
}

export function TestBuilderClient() {
  const [code, setCode] = useState('')
  const [testCount, setTestCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [openingUi, setOpeningUi] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCodeChange = useCallback((newCode: string, count: number) => {
    setCode(newCode)
    setTestCount(count)
  }, [])

  const handleRun = async () => {
    if (!code.trim() || testCount === 0) {
      setError('Add at least one Test block to the workspace before running.')
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

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

  const handleClear = () => {
    // Reload the page to reset the Blockly workspace
    window.location.reload()
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-800 bg-gray-900 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <span className="font-semibold text-white">KayScope</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300">Test Builder</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* test count badge */}
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
            {testCount} test{testCount !== 1 ? 's' : ''} · {code.split('\n').length} lines
          </span>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={running || testCount === 0}
            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white
              hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500
              disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {running ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                Running…
              </>
            ) : (
              <>▶ Run Test</>
            )}
          </button>

          {/* Test UI button */}
          <button
            onClick={handleOpenUI}
            disabled={openingUi}
            className="flex items-center gap-1.5 rounded-md border border-purple-700 bg-purple-900/40 px-3 py-1.5
              text-sm font-medium text-purple-300 hover:bg-purple-800/60 hover:text-purple-100
              disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {openingUi ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-purple-300 border-t-transparent" />Opening…</>
            ) : '🎭 Test UI'}
          </button>

          {/* Clear button */}
          <button
            onClick={handleClear}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-400
              hover:border-gray-500 hover:text-gray-200 focus:outline-none transition-colors"
          >
            ✕ Reset
          </button>
        </div>
      </header>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="shrink-0 bg-red-900/50 border-b border-red-700 px-5 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Main 2-column layout ─────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left — Blockly drag-and-drop workspace */}
        <div className="relative flex-1 min-w-0 overflow-hidden border-r border-gray-800">
          {/* Blockly needs a position:absolute child inside a position:relative parent to fill height */}
          <div className="absolute inset-0">
            <BlocklyEditor onCodeChange={handleCodeChange} />
          </div>
          {/* Overlay instructions for empty workspace */}
          {testCount === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl bg-gray-900/80 p-6 text-center max-w-xs backdrop-blur">
                <p className="text-2xl mb-2">🧩</p>
                <p className="text-sm font-medium text-gray-300 mb-1">Drag a block to start</p>
                <p className="text-xs text-gray-500">
                  Find <strong>🧪 Test</strong> in the toolbox on the left, then add steps inside it.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Code preview + Results */}
        <div className="flex w-96 shrink-0 flex-col border-l border-gray-800 lg:w-[420px] xl:w-[480px]">
          {/* Code preview — upper half */}
          <div className="flex-1 min-h-0 overflow-hidden border-b border-gray-800 bg-gray-900/50">
            <CodePreview code={code} testCount={testCount} />
          </div>

          {/* Results panel — lower half */}
          <div className="flex-1 min-h-0 overflow-hidden bg-gray-950">
            <ResultsPanel result={result} running={running} />
          </div>
        </div>
      </div>
    </div>
  )
}
