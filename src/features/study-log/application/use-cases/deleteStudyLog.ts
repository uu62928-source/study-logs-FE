import { createStudyLogId } from '../../domain/studyLog'
import type { StudyLogDeleter } from '../ports/StudyLogRepository'

export type DeleteStudyLog = (studyLogId: string) => Promise<void>

export function createDeleteStudyLog(
  repository: StudyLogDeleter,
): DeleteStudyLog {
  return (studyLogId) => repository.remove(createStudyLogId(studyLogId))
}
