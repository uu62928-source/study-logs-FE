import type { StudyLog } from '../../domain/studyLog'

export interface StudyLogRepository {
  findAll(): Promise<readonly StudyLog[]>
}
