import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { requireSession } from '@/lib/auth/session'
import type { RunResult, TestResult, RunSummary } from '@/app/test-builder/types'
import { playwrightRunBodySchema } from '@/lib/schemas'
import { createRateLimiter } from '@/lib/api/rate-limiter'
import { getClientIp } from '@/lib/api/http-utils'

// 5 test runs per minute per IP (resource-intensive endpoint)
const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 })

const execAsync = promisify(exec)

const GENERATED_DIR = join(process.cwd(), 'tests', 'e2e', 'generated')
const SPEC_FILE = join(GENERATED_DIR, 'builder-test.spec.ts')
const BUILDER_CONFIG = join(process.cwd(), 'playwright.builder.config.ts')

/* ── Playwright JSON reporter shape (relevant parts) ──────────────── */
interface PWJsonResult {
  status: string
  duration: number
  error?: { message?: string; stack?: string }
}
interface PWJsonSpec {
  title: string
  ok: boolean
  tests: Array<{ results: PWJsonResult[] }>
}
interface PWJsonSuite {
  specs?: PWJsonSpec[]
  suites?: PWJsonSuite[]
}
interface PWJsonReport {
  stats?: {
    duration?: number
    expected?: number
    unexpected?: number
    skipped?: number
  }
  suites?: PWJsonSuite[]
}

function flattenSpecs(suite: PWJsonSuite): PWJsonSpec[] {
  const specs: PWJsonSpec[] = []
  if (suite.specs) specs.push(...suite.specs)
  if (suite.suites) suite.suites.forEach((s) => specs.push(...flattenSpecs(s)))
  return specs
}

function parsePlaywrightJson(raw: string, generatedCode: string): RunResult {
  // The JSON reporter outputs to stdout; find the first '{' in case of leading noise
  const jsonStart = raw.indexOf('{')
  if (jsonStart === -1) return fallbackResult(raw, generatedCode)

  let report: PWJsonReport
  try {
    report = JSON.parse(raw.slice(jsonStart)) as PWJsonReport
  } catch {
    return fallbackResult(raw, generatedCode)
  }

  const specs = (report.suites ?? []).flatMap(flattenSpecs)
  const tests: TestResult[] = specs.map((spec) => {
    const latestResult = spec.tests?.[0]?.results?.at(-1)
    const status = (latestResult?.status ?? 'failed') as TestResult['status']
    const error = latestResult?.error
      ? (latestResult.error.message ?? latestResult.error.stack ?? '')
      : undefined
    return {
      testName: spec.title,
      status,
      duration: latestResult?.duration ?? 0,
      error,
    }
  })

  const stats = report.stats ?? {}
  const summary: RunSummary = {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed' || t.status === 'timedOut').length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
    duration: stats.duration ?? 0,
  }

  return {
    success: summary.failed === 0 && summary.total > 0,
    summary,
    tests,
    rawOutput: raw,
    generatedCode,
  }
}

function fallbackResult(rawOutput: string, generatedCode: string): RunResult {
  // Text-based fallback: parse "X passed", "Y failed" from Playwright CLI output
  const passedMatch = rawOutput.match(/(\d+)\s+passed/i)
  const failedMatch = rawOutput.match(/(\d+)\s+failed/i)
  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0
  const total = passed + failed

  const summary: RunSummary = { total, passed, failed, skipped: 0, duration: 0 }
  return {
    success: failed === 0 && total > 0,
    summary,
    tests: [],
    rawOutput,
    generatedCode,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await rateLimiter.check(getClientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Only allow in development for safety
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test runner is disabled in production' },
      { status: 403 }
    )
  }

  let code: string
  try {
    const body = await req.json()
    const parsed = playwrightRunBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    code = parsed.data.code
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    // Write generated spec to disk
    await mkdir(GENERATED_DIR, { recursive: true })
    await writeFile(SPEC_FILE, code, 'utf8')

    // Normalize config path to forward slashes — Windows backslashes are
    // mistakenly treated as regex escape sequences by Playwright's CLI parser.
    const configPath = BUILDER_CONFIG.replace(/\\/g, '/')

    // Run Playwright with the builder-specific config.
    // Do NOT pass the spec file as a positional arg — Playwright interprets
    // positional args as regex patterns, not file paths, so backslash paths
    // on Windows produce "No tests found". The testDir in the config already
    // points to the generated folder so Playwright will pick up the file automatically.
    let stdout = ''
    let stderr = ''
    try {
      const result = await execAsync(
        `npx playwright test --config="${configPath}" --reporter=json`,
        {
          cwd: process.cwd(),
          timeout: 120_000,   // 2-minute hard cap
          maxBuffer: 20 * 1024 * 1024, // 20 MB
        }
      )
      stdout = result.stdout
      stderr = result.stderr
    } catch (execErr: unknown) {
      // Playwright exits with code 1 when tests fail — still produces output
      const err = execErr as { stdout?: string; stderr?: string }
      stdout = err.stdout ?? ''
      stderr = err.stderr ?? ''
    }

    const rawOutput = [stdout, stderr].filter(Boolean).join('\n')
    const runResult = parsePlaywrightJson(stdout || stderr, code)
    // Ensure rawOutput is the full combined output
    runResult.rawOutput = rawOutput

    return NextResponse.json(runResult)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
