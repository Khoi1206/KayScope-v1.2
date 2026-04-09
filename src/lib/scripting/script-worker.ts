import { executeScript } from './script-sandbox'
import type { ScriptRunContext } from './script-sandbox'

/* eslint-disable @typescript-eslint/no-explicit-any */
const workerSelf = self as any

workerSelf.onmessage = (e: MessageEvent<{ script: string; context: ScriptRunContext }>) => {
  const { script, context } = e.data
  const result = executeScript(script, context)
  workerSelf.postMessage(result)
}
