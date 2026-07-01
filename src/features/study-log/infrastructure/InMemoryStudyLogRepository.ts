import type { StudyLogRepository } from '../application/ports/StudyLogRepository'
import type { StudyLog } from '../domain/studyLog'

export class InMemoryStudyLogRepository implements StudyLogRepository {
  readonly #studyLogs: readonly StudyLog[]

  constructor(studyLogs: readonly StudyLog[]) {
    this.#studyLogs = studyLogs
  }

  findAll(): Promise<readonly StudyLog[]> {
    return Promise.resolve(this.#studyLogs)
  }
}
