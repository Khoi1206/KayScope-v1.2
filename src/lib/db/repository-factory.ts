/**
 * Repository Factory — Dependency Inversion Principle
 *
 * API routes depend on these factory functions, which return repository
 * *interfaces*. No route ever imports a concrete MongoDB class directly,
 * so swapping the underlying database (e.g. for tests) requires a change
 * only in this single file.
 */

import { MongoDBWorkspaceRepository } from '@/modules/workspace/infrastructure/repositories/mongodb-workspace.repository'
import { MongoDBCollectionRepository } from '@/modules/collection/infrastructure/repositories/mongodb-collection.repository'
import { MongoDBFolderRepository } from '@/modules/folder/infrastructure/repositories/mongodb-folder.repository'
import { MongoDBRequestRepository } from '@/modules/request/infrastructure/repositories/mongodb-request.repository'
import { MongoDBEnvironmentRepository } from '@/modules/environment/infrastructure/repositories/mongodb-environment.repository'
import { MongoDBHistoryRepository } from '@/modules/history/infrastructure/repositories/mongodb-history.repository'
import { MongoDBActivityRepository } from '@/modules/activity/infrastructure/repositories/mongodb-activity.repository'
import { MongoDBTestRunRepository } from '@/modules/test-run/infrastructure/repositories/mongodb-test-run.repository'
import { MongoDBUserRepository } from '@/modules/auth/infrastructure/repositories/mongodb-user.repository'

import type { IWorkspaceRepository } from '@/modules/workspace/domain/repositories/workspace.repository'
import type { ICollectionRepository } from '@/modules/collection/domain/repositories/collection.repository'
import type { IFolderRepository } from '@/modules/folder/domain/repositories/folder.repository'
import type { IRequestRepository } from '@/modules/request/domain/repositories/request.repository'
import type { IEnvironmentRepository } from '@/modules/environment/domain/repositories/environment.repository'
import type { IHistoryRepository } from '@/modules/history/domain/repositories/history.repository'
import type { IActivityRepository } from '@/modules/activity/domain/repositories/activity.repository'
import type { ITestRunRepository } from '@/modules/test-run/domain/repositories/test-run.repository'
import type { IUserRepository } from '@/modules/auth/domain/repositories/user.repository'

export const createWorkspaceRepository = (): IWorkspaceRepository => new MongoDBWorkspaceRepository()
export const createCollectionRepository = (): ICollectionRepository => new MongoDBCollectionRepository()
export const createFolderRepository = (): IFolderRepository => new MongoDBFolderRepository()
export const createRequestRepository = (): IRequestRepository => new MongoDBRequestRepository()
export const createEnvironmentRepository = (): IEnvironmentRepository => new MongoDBEnvironmentRepository()
export const createHistoryRepository = (): IHistoryRepository => new MongoDBHistoryRepository()
export const createActivityRepository = (): IActivityRepository => new MongoDBActivityRepository()
export const createTestRunRepository = (): ITestRunRepository => new MongoDBTestRunRepository()
export const createUserRepository = (): IUserRepository => new MongoDBUserRepository()
