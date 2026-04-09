import type { RunResult } from '@/app/test-builder/types'

export interface TestRun {
  id: string
  workspaceId: string
  userId: string
  name: string
  code: string
  blocklyState?: object
  result: RunResult
  savedAt: string
  createdAt: Date
}

export interface CreateTestRunDTO {
  workspaceId: string
  userId: string
  name: string
  code: string
  blocklyState?: object
  result: RunResult
  savedAt: string
}

export interface UpdateTestRunDTO {
  result: RunResult
  savedAt: string
}
