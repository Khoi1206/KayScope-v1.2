'use client'

import { memo } from 'react'
import { tryFormatJson } from './utils'

function highlightLine(line: string): string {
  return line
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"([^"]*)"(\s*:)/g, '<span class="text-purple-400">"$1"</span>$2')
    .replace(/:\s*"([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-orange-400">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-gray-500">$1</span>')
}

export const SyntaxHighlight = memo(function SyntaxHighlight({ json }: { json: string }) {
  const lines = tryFormatJson(json).split('\n')
  return (
    <pre className="text-xs leading-5 whitespace-pre-wrap break-all">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="select-none text-gray-700 w-8 text-right pr-3 shrink-0">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlightLine(line) }} />
        </div>
      ))}
    </pre>
  )
})
