import type { StudyLog } from '../../domain/studyLog'

export interface StudyLogReader {
  findAll(): Promise<readonly StudyLog[]>
}

export interface StudyLogCreator {
  add(studyLog: StudyLog): Promise<void>
}

export interface StudyLogWriter {
  save(studyLog: StudyLog): Promise<void>
}

export interface StudyLogRepository
  extends StudyLogReader, StudyLogCreator, StudyLogWriter {}
