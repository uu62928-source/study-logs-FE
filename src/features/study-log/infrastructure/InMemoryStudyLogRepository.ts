import type { StudyLogRepository } from '../application/ports/StudyLogRepository'
import type { StudyLog } from '../domain/studyLog'

export class InMemoryStudyLogRepository implements StudyLogRepository {
  #studyLogs: StudyLog[]

  constructor(studyLogs: readonly StudyLog[]) {
    this.#studyLogs = [...studyLogs]
  }

  findAll(): Promise<readonly StudyLog[]> {
    return Promise.resolve([...this.#studyLogs])
  }

  save(studyLog: StudyLog): Promise<void> {
    const index = this.#studyLogs.findIndex(({ id }) => id === studyLog.id)

    if (index === -1) {
      return Promise.reject(new Error('更新対象の学習ログが見つかりません。'))
    }

    this.#studyLogs[index] = studyLog

    return Promise.resolve()
  }
}
