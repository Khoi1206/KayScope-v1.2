import { MongoClient } from 'mongodb'

// The environment variable must be set in .env.local
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable in .env.local'
  )
}

/**
 * Declare a module-level global to cache the MongoClient across hot reloads
 * in development (Next.js HMR).
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (!global._mongoClientPromise) {
  const client = new MongoClient(MONGODB_URI)
  global._mongoClientPromise = client.connect()
}
const clientPromise: Promise<MongoClient> = global._mongoClientPromise!

/**
 * Helper to get a database instance.
 * @param dbName database name; defaults to MONGODB_DB env var or 'kayscope'
 */
export async function getDatabase(dbName?: string) {
  const resolvedClient = await clientPromise
  return resolvedClient.db(dbName ?? process.env.MONGODB_DB ?? 'kayscope')
}

export default clientPromise
