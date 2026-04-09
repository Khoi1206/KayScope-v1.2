import { IHistoryRepository } from '../repositories/history.repository'
import { RequestHistory } from '../entities/history.entity'

export class GetHistoryByRequestUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(requestId: string, limit: number): Promise<RequestHistory[]> {
    return this.historyRepo.findByRequest(requestId, limit)
  }
}
