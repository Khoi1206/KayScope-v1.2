import type { ScriptRunContext, ScriptRunResult } from './script-sandbox'

const SCRIPT_TIMEOUT_MS = 10_000

const POOL_SIZE = 2

interface PooledWorker {
  worker: Worker
  busy: boolean
}

interface PendingTask {
  script: string
  context: ScriptRunContext
  resolve: (result: ScriptRunResult) => void
}

function makeTimeoutResult(context: ScriptRunContext): ScriptRunResult {
  return {
    envVars: { ...context.envVars },
    tempVars: { ...context.tempVars },
    logs: [],
    tests: [],
    error: 'Script execution timed out (10 s limit)',
  }
}

function makeErrorResult(context: ScriptRunContext, message: string): ScriptRunResult {
  return {
    envVars: { ...context.envVars },
    tempVars: { ...context.tempVars },
    logs: [],
    tests: [],
    error: message,
  }
}

export class ScriptWorkerPool {
  private static instance: ScriptWorkerPool | null = null

  private pool: PooledWorker[] = []
  private queue: PendingTask[] = []
  private inProgress = new Map<PooledWorker, PendingTask>()
  private disposed = false

  private constructor() {}

  static getInstance(): ScriptWorkerPool {
    if (!ScriptWorkerPool.instance) {
      ScriptWorkerPool.instance = new ScriptWorkerPool()
    }
    return ScriptWorkerPool.instance
  }

  run(script: string, context: ScriptRunContext): Promise<ScriptRunResult> {
    if (this.disposed) {
      return Promise.resolve(makeErrorResult(context, 'Worker pool has been disposed'))
    }

    return new Promise<ScriptRunResult>((resolve) => {
      const idle = this.pool.find(pw => !pw.busy)
      if (idle) {
        this.executeOnWorker(idle, script, context, resolve)
      } else if (this.pool.length < POOL_SIZE) {
        const pw = this.createWorker()
        if (pw) {
          this.pool.push(pw)
          this.executeOnWorker(pw, script, context, resolve)
        } else {
          resolve(makeErrorResult(context, 'Failed to create script worker'))
        }
      } else {
        this.queue.push({ script, context, resolve })
      }
    })
  }

  dispose(): void {
    this.disposed = true
    for (const pw of this.pool) {
      pw.worker.terminate()
    }
    this.pool = []
    this.inProgress.forEach((task) => {
      task.resolve(makeErrorResult(task.context, 'Worker pool disposed'))
    })
    this.inProgress.clear()
    for (const task of this.queue) {
      task.resolve(makeErrorResult(task.context, 'Worker pool disposed'))
    }
    this.queue = []
    ScriptWorkerPool.instance = null
  }

  private createWorker(): PooledWorker | null {
    try {
      const worker = new Worker(
        new URL('./script-worker.ts', import.meta.url),
      )
      return { worker, busy: false }
    } catch {
      return null
    }
  }

  private replaceWorker(pw: PooledWorker): void {
    pw.worker.terminate()
    this.inProgress.delete(pw)
    if (this.disposed) return
    const replacement = this.createWorker()
    if (replacement) {
      const idx = this.pool.indexOf(pw)
      if (idx !== -1) {
        this.pool[idx] = replacement
        this.drainQueue(replacement)
      }
    } else {
      this.pool = this.pool.filter(p => p !== pw)
    }
  }

  private executeOnWorker(
    pw: PooledWorker,
    script: string,
    context: ScriptRunContext,
    resolve: (result: ScriptRunResult) => void,
  ): void {
    pw.busy = true

    const timeout = setTimeout(() => {
      cleanup()
      resolve(makeTimeoutResult(context))
      this.replaceWorker(pw)
    }, SCRIPT_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeout)
      pw.worker.onmessage = null
      pw.worker.onerror = null
    }

    pw.worker.onmessage = (e: MessageEvent<ScriptRunResult>) => {
      cleanup()
      this.inProgress.delete(pw)
      pw.busy = false
      resolve(e.data)
      this.drainQueue(pw)
    }

    pw.worker.onerror = (err) => {
      cleanup()
      resolve(makeErrorResult(context, err.message ?? 'Script worker error'))
      this.replaceWorker(pw)
    }

    this.inProgress.set(pw, { script, context, resolve })
    pw.worker.postMessage({ script, context })
  }

  private drainQueue(pw: PooledWorker): void {
    if (pw.busy || this.queue.length === 0) return
    const next = this.queue.shift()!
    this.executeOnWorker(pw, next.script, next.context, next.resolve)
  }
}
