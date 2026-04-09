import { executeScript } from './script-sandbox'
import type { ScriptRunContext, ScriptRunResult } from './script-sandbox'
import { ScriptWorkerPool } from './script-worker-pool'

export type { ScriptLog, TestResult, ScriptRunContext, ScriptRunResult } from './script-sandbox'


export async function runScript(
  script: string,
  context: ScriptRunContext,
): Promise<ScriptRunResult> {
  if (typeof Worker === 'undefined') {
    return executeScript(script, context)
  }
  try {
    return await ScriptWorkerPool.getInstance().run(script, context)
  } catch {
    return executeScript(script, context)
  }
}
