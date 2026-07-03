import type { StudyLogRepository } from '../application/ports/StudyLogRepository'
import type { StudyLog, StudyLogId } from '../domain/studyLog'

export class InMemoryStudyLogRepository implements StudyLogRepository {
  #studyLogs: StudyLog[]

  constructor(studyLogs: readonly StudyLog[]) {
    this.#studyLogs = [...studyLogs]
  }

  findAll(): Promise<readonly StudyLog[]> {
    return Promise.resolve([...this.#studyLogs])
  }

  add(studyLog: StudyLog): Promise<void> {
    const alreadyExists = this.#studyLogs.some(({ id }) => id === studyLog.id)

    if (alreadyExists) {
      return Promise.reject(new Error('同じIDの学習ログが存在します。'))
    }

    this.#studyLogs.push(studyLog)

    return Promise.resolve()
  }

  save(studyLog: StudyLog): Promise<void> {
    const index = this.#studyLogs.findIndex(({ id }) => id === studyLog.id)

    if (index === -1) {
      return Promise.reject(new Error('更新対象の学習ログが見つかりません。'))
    }

    this.#studyLogs[index] = studyLog

    return Promise.resolve()
  }

  remove(studyLogId: StudyLogId): Promise<void> {
    const index = this.#studyLogs.findIndex(({ id }) => id === studyLogId)

    if (index === -1) {
      return Promise.reject(new Error('削除対象の学習ログが見つかりません。'))
    }

    this.#studyLogs.splice(index, 1)

    return Promise.resolve()
  }
}
