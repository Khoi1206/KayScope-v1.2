import type { Folder, SavedRequest, FolderNode, FolderTreeResult } from './types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function tryFormatJson(str: string): string {
  try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
}

export function statusColor(code: number) {
  if (code < 300) return 'text-green-400'
  if (code < 400) return 'text-yellow-400'
  if (code < 500) return 'text-orange-400'
  return 'text-red-400'
}

export function statusBg(code: number) {
  if (code < 300) return 'bg-green-500/10 border-green-500/20'
  if (code < 400) return 'bg-yellow-500/10 border-yellow-500/20'
  if (code < 500) return 'bg-orange-500/10 border-orange-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

export function buildFolderTree(folders: Folder[], requests: SavedRequest[]): FolderTreeResult {
  const folderMap = new Map<string, FolderNode>()
  for (const f of folders) {
    folderMap.set(f.id, { folder: f, children: [], requests: [] })
  }
  const rootRequests: SavedRequest[] = []
  for (const req of requests) {
    if (req.folderId && folderMap.has(req.folderId)) {
      folderMap.get(req.folderId)!.requests.push(req)
    } else {
      rootRequests.push(req)
    }
  }
  const rootFolders: FolderNode[] = []
  for (const node of Array.from(folderMap.values())) {
    if (node.folder.parentFolderId && folderMap.has(node.folder.parentFolderId)) {
      folderMap.get(node.folder.parentFolderId)!.children.push(node)
    } else {
      rootFolders.push(node)
    }
  }
  return { rootRequests, rootFolders }
}

export function timeAgo(dateStr: string): string {
  return dayjs(dateStr).fromNow()
}

export async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}
