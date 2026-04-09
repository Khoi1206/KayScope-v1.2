'use client'

import { memo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'

/* Lazy-load Monaco — it's ~2MB, load only when the script tabs are viewed */
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <span className="text-xs text-gray-600">Loading editor…</span>
    </div>
  ),
})

interface ScriptEditorProps {
  value: string
  onChange: (v: string) => void
}

const handleEditorMount: OnMount = (editor) => {
  // Remove the default padding so it blends with the surrounding UI
  editor.updateOptions({ padding: { top: 8, bottom: 8 } })
}

export const ScriptEditor = memo(function ScriptEditor({ value, onChange }: ScriptEditorProps) {
  const handleChange = useCallback((v: string | undefined) => onChange(v ?? ''), [onChange])
  return (
    <div className="rounded-md overflow-hidden border border-gray-700" style={{ minHeight: 220 }}>
      <MonacoEditor
        height={220}
        language="javascript"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          contextmenu: false,
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  )
})
