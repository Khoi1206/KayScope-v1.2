import { IHistoryRepository } from '../repositories/history.repository'
import { RequestHistory } from '../entities/history.entity'

export class GetHistoryByWorkspaceUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(workspaceId: string, limit: number, skip: number): Promise<RequestHistory[]> {
    return this.historyRepo.findByWorkspace(workspaceId, limit, skip)
  }
}
