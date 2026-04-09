// ─── Folder Entity ────────────────────────────────────────────────────────────

export interface Folder {
  id: string
  collectionId: string
  parentFolderId?: string   // undefined = root-level folder
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// DTOs
export interface CreateFolderDTO {
  collectionId: string
  parentFolderId?: string
  name: string
  createdBy: string
}

export interface UpdateFolderDTO {
  name?: string
  parentFolderId?: string
}
