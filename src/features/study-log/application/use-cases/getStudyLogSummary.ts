import {
  calculateTotalStudyMinutes,
  type StudyLog,
} from '../../domain/studyLog'
import type { StudyLogRepository } from '../ports/StudyLogRepository'

export type StudyLogSummary = Readonly<{
  studyLogs: readonly StudyLog[]
  totalMinutes: number
}>

export type GetStudyLogSummary = () => Promise<StudyLogSummary>

export function createGetStudyLogSummary(
  repository: StudyLogRepository,
): GetStudyLogSummary {
  return async () => {
    const studyLogs = await repository.findAll()

    return {
      studyLogs,
      totalMinutes: calculateTotalStudyMinutes(studyLogs),
    }
  }
}
