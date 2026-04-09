export interface TestResult {
  testName: string
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted'
  duration: number
  error?: string
}

export interface RunSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
}

export interface RunResult {
  success: boolean
  summary: RunSummary
  tests: TestResult[]
  rawOutput: string
  generatedCode: string
}
