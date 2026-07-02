import type { StudyLog } from '../../domain/studyLog'
import type { StudyLogWriter } from '../ports/StudyLogRepository'

export type UpdateStudyLog = (studyLog: StudyLog) => Promise<void>

export function createUpdateStudyLog(
  repository: StudyLogWriter,
): UpdateStudyLog {
  return (studyLog) => repository.save(studyLog)
}
