/**
 * Importer registry — OCP
 *
 * To add support for a new import format (e.g. Insomnia, Bruno, HAR):
 * 1. Create a new class that implements ICollectionImporter.
 * 2. Add an instance to this array.
 * 3. Done — no existing code needs to change.
 *
 * The first importer whose detect() returns true wins.
 * Order matters: more specific formats (OpenAPI, KayScope) come before generic
 * ones (Postman heuristic) to avoid false positives.
 */
import { OpenApiImporter } from './openapi-importer'
import { KayScopeImporter } from './kayscope-importer'
import { PostmanImporter } from './postman-importer'
import type { ICollectionImporter } from './collection-importer.interface'

export const COLLECTION_IMPORTERS: ICollectionImporter[] = [
  new OpenApiImporter(),
  new KayScopeImporter(),
  new PostmanImporter(),
]
