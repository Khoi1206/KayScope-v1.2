import type { RequestHistory, CreateHistoryDTO } from '../entities/history.entity'

export interface IHistoryRepository {
  findByWorkspace(workspaceId: string, limit?: number, skip?: number): Promise<RequestHistory[]>
  findByRequest(requestId: string, limit?: number): Promise<RequestHistory[]>
  create(dto: CreateHistoryDTO): Promise<RequestHistory>
  deleteByWorkspace(workspaceId: string): Promise<boolean>
  delete(id: string): Promise<boolean>
}
