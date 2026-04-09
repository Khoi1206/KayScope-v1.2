'use client'

interface Props {
  code: string
  testCount: number
}

export function CodePreview({ code, testCount }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-1.5">
        <span className="text-xs font-medium text-gray-400">Generated Code</span>
        <span className="rounded-full bg-blue-900/60 px-2 py-0.5 text-xs text-blue-300">
          {testCount} test{testCount !== 1 ? 's' : ''}
        </span>
      </div>
      <pre className="flex-1 overflow-auto p-3 text-xs leading-5 text-emerald-300 font-mono whitespace-pre">
        {code || '// Add a Test block to the workspace to generate code...'}
      </pre>
    </div>
  )
}
