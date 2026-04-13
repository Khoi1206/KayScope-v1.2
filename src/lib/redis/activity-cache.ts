import { getRedis } from './client'

const KEY = (wsId: string) => `activity:first:${wsId}`
const TTL_SECONDS = 60 // 1 phút

export async function getCachedActivity(workspaceId: string): Promise<unknown | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const v = await r.get(KEY(workspaceId))
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export async function setCachedActivity(workspaceId: string, data: unknown): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    await r.set(KEY(workspaceId), JSON.stringify(data), 'EX', TTL_SECONDS)
  } catch { /* ignore */ }
}

export async function invalidateActivityCache(workspaceId: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    await r.del(KEY(workspaceId))
  } catch { /* ignore */ }
}
