import type { StudyLog, StudyLogId } from '../../domain/studyLog'

export type StudyLogRequestOptions = Readonly<{
  signal?: AbortSignal
}>

export interface StudyLogReader {
  findAll(options?: StudyLogRequestOptions): Promise<readonly StudyLog[]>
}

export interface StudyLogCreator {
  add(studyLog: StudyLog): Promise<void>
}

export interface StudyLogWriter {
  save(studyLog: StudyLog): Promise<void>
}

export interface StudyLogDeleter {
  remove(studyLogId: StudyLogId): Promise<void>
}

export interface StudyLogRepository
  extends StudyLogReader, StudyLogCreator, StudyLogWriter, StudyLogDeleter {}
