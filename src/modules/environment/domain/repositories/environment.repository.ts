import { Environment, CreateEnvironmentDTO, UpdateEnvironmentDTO } from '../entities/environment.entity'

export interface IEnvironmentRepository {
  findById(id: string): Promise<Environment | null>
  findByWorkspace(workspaceId: string): Promise<Environment[]>
  create(dto: CreateEnvironmentDTO): Promise<Environment>
  update(id: string, dto: UpdateEnvironmentDTO): Promise<Environment | null>
  delete(id: string): Promise<boolean>
}
