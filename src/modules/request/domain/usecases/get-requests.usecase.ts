import { IRequestRepository } from '../repositories/request.repository'
import { SavedRequest } from '../entities/request.entity'

export class GetRequestsUseCase {
  constructor(private readonly requestRepo: IRequestRepository) {}

  async execute(collectionId: string): Promise<SavedRequest[]> {
    return this.requestRepo.findByCollection(collectionId)
  }
}
