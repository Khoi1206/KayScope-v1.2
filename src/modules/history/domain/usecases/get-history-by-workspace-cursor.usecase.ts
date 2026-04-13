import type { IHistoryRepository } from '../repositories/history.repository'
import type { RequestHistory } from '../entities/history.entity'

export class GetHistoryByWorkspaceCursorUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(
    workspaceId: string,
    limit: number,
    afterId?: string,
  ): Promise<{ items: RequestHistory[], nextCursor: string | null }> {
    return this.historyRepo.findByWorkspaceCursor(workspaceId, limit, afterId)
  }
}
