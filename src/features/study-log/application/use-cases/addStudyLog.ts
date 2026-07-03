import type { StudyLog } from '../../domain/studyLog'
import type { StudyLogCreator } from '../ports/StudyLogRepository'

export type AddStudyLog = (studyLog: StudyLog) => Promise<void>

export function createAddStudyLog(repository: StudyLogCreator): AddStudyLog {
  return (studyLog) => repository.add(studyLog)
}
