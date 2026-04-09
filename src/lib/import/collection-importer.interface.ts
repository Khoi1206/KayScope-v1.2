import type { MongoClient } from 'mongodb'

export interface ImportResult {
  collection: {
    id: string
    workspaceId: string
    name: string
    description?: string
    createdBy: string
    createdAt: Date
    updatedAt: Date
  }
  importedRequests: number
  format: string
}

/**
 * ICollectionImporter — OCP
 *
 * Each supported import format (OpenAPI, KayScope, Postman…) is a separate class
 * that implements this interface. Adding a new format requires only a new class +
 * registration in importer-registry.ts — no existing importer code is modified.
 */
export interface ICollectionImporter {
  /** Returns true if this importer can handle the given data format. */
  detect(data: Record<string, unknown>): boolean

  /**
   * Performs the import inside a MongoDB transaction and returns a
   * format-agnostic result. HTTP shaping is the route handler's responsibility.
   */
  import(
    data: Record<string, unknown>,
    workspaceId: string,
    userId: string,
    client: MongoClient,
  ): Promise<ImportResult>
}
