'use client'

import type { RunResult } from '../types'

interface Props {
  result: RunResult | null
  running: boolean
}

export function ResultsPanel({ result, running }: Props) {
  if (running) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm">Running tests…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Click <strong className="text-blue-400">▶ Run Test</strong> to see results here.</p>
      </div>
    )
  }

  const { summary, tests, rawOutput, success } = result

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4 text-sm">
      {/* ── Summary bar ─────────────────────────────────────────────── */}
      <div
        className={`rounded-lg border px-4 py-2.5 flex items-center gap-6 ${
          success
            ? 'border-green-700 bg-green-950 text-green-300'
            : 'border-red-700 bg-red-950 text-red-300'
        }`}
      >
        <span className="text-lg font-bold">{success ? '✅ PASSED' : '❌ FAILED'}</span>
        <span className="text-xs text-gray-400">
          {summary.passed}/{summary.total} passed
          {summary.failed > 0 && ` · ${summary.failed} failed`}
          {summary.skipped > 0 && ` · ${summary.skipped} skipped`}
          {' · '}
          {(summary.duration / 1000).toFixed(1)}s
        </span>
      </div>

      {/* ── Per-test rows ────────────────────────────────────────────── */}
      {tests.length > 0 && (
        <div className="flex flex-col gap-1">
          {tests.map((t, i) => (
            <div
              key={i}
              className={`rounded border p-2 ${
                t.status === 'passed'
                  ? 'border-green-800/50 bg-green-950/30'
                  : t.status === 'failed'
                  ? 'border-red-800/50 bg-red-950/30'
                  : 'border-gray-700/50 bg-gray-900/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={
                  t.status === 'passed' ? 'text-green-400' :
                  t.status === 'failed' ? 'text-red-400' :
                  'text-yellow-400'
                }>
                  {t.status === 'passed' ? '✓' : t.status === 'failed' ? '✗' : '⊝'}
                  {' '}
                  <span className="text-gray-200">{t.testName}</span>
                </span>
                <span className="text-xs text-gray-500">{t.duration}ms</span>
              </div>
              {t.error && (
                <pre className="mt-1.5 rounded bg-gray-900 p-2 text-xs text-red-300 whitespace-pre-wrap break-all">
                  {t.error}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Raw terminal output ──────────────────────────────────────── */}
      <details className="mt-auto">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
          Raw output
        </summary>
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-400 whitespace-pre-wrap break-all">
          {rawOutput || '(empty)'}
        </pre>
      </details>
    </div>
  )
}
