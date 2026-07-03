import type { StudyLogRepository } from '../application/ports/StudyLogRepository'
import {
  createStudyLog,
  type StudyLog,
  type StudyLogId,
} from '../domain/studyLog'

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

type StoredStudyLogDto = Readonly<{
  id: string
  topic: string
  durationMinutes: number
}>

type StoredStudyLogsDto = Readonly<{
  version: 1
  studyLogs: readonly StoredStudyLogDto[]
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStudyLog(value: unknown): StudyLog {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.topic !== 'string' ||
    typeof value.durationMinutes !== 'number'
  ) {
    throw new Error('保存された学習ログの形式が不正です。')
  }

  try {
    return createStudyLog({
      id: value.id,
      topic: value.topic,
      durationMinutes: value.durationMinutes,
    })
  } catch {
    throw new Error('保存された学習ログの形式が不正です。')
  }
}

function deserializeStudyLogs(value: string): readonly StudyLog[] {
  const parsed: unknown = JSON.parse(value)

  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.studyLogs)
  ) {
    throw new Error('保存された学習ログの形式が不正です。')
  }

  return parsed.studyLogs.map(toStudyLog)
}

function serializeStudyLogs(studyLogs: readonly StudyLog[]): string {
  const dto: StoredStudyLogsDto = {
    version: 1,
    studyLogs: studyLogs.map((studyLog) => ({
      id: studyLog.id,
      topic: studyLog.topic,
      durationMinutes: studyLog.durationMinutes,
    })),
  }

  return JSON.stringify(dto)
}

function attempt<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation())
  } catch (error) {
    const reason =
      error instanceof Error
        ? error
        : new Error('学習ログの保存処理に失敗しました。')
    return Promise.reject(reason)
  }
}

export class LocalStorageStudyLogRepository implements StudyLogRepository {
  readonly #storage: StoragePort
  readonly #storageKey: string
  readonly #initialStudyLogs: readonly StudyLog[]

  constructor(
    storage: StoragePort,
    storageKey: string,
    initialStudyLogs: readonly StudyLog[],
  ) {
    this.#storage = storage
    this.#storageKey = storageKey
    this.#initialStudyLogs = [...initialStudyLogs]
  }

  findAll(): Promise<readonly StudyLog[]> {
    return attempt(() => this.#read())
  }

  add(studyLog: StudyLog): Promise<void> {
    return attempt(() => {
      const studyLogs = this.#read()
      const alreadyExists = studyLogs.some(({ id }) => id === studyLog.id)

      if (alreadyExists) {
        throw new Error('同じIDの学習ログが存在します。')
      }

      this.#write([...studyLogs, studyLog])
    })
  }

  save(studyLog: StudyLog): Promise<void> {
    return attempt(() => {
      const studyLogs = this.#read()
      const index = studyLogs.findIndex(({ id }) => id === studyLog.id)

      if (index === -1) {
        throw new Error('更新対象の学習ログが見つかりません。')
      }

      const updatedStudyLogs = [...studyLogs]
      updatedStudyLogs[index] = studyLog
      this.#write(updatedStudyLogs)
    })
  }

  remove(studyLogId: StudyLogId): Promise<void> {
    return attempt(() => {
      const studyLogs = this.#read()
      const index = studyLogs.findIndex(({ id }) => id === studyLogId)

      if (index === -1) {
        throw new Error('削除対象の学習ログが見つかりません。')
      }

      this.#write(studyLogs.filter(({ id }) => id !== studyLogId))
    })
  }

  #read(): readonly StudyLog[] {
    const storedValue = this.#storage.getItem(this.#storageKey)

    if (storedValue === null) {
      return [...this.#initialStudyLogs]
    }

    return deserializeStudyLogs(storedValue)
  }

  #write(studyLogs: readonly StudyLog[]): void {
    this.#storage.setItem(this.#storageKey, serializeStudyLogs(studyLogs))
  }
}
