import {
  calculateTotalStudyMinutes,
  type StudyLog,
} from '../../domain/studyLog'
import type {
  StudyLogReader,
  StudyLogRequestOptions,
} from '../ports/StudyLogRepository'

export type StudyLogSummary = Readonly<{
  studyLogs: readonly StudyLog[]
  totalMinutes: number
}>

export type GetStudyLogSummary = (
  options?: StudyLogRequestOptions,
) => Promise<StudyLogSummary>

export function createGetStudyLogSummary(
  repository: StudyLogReader,
): GetStudyLogSummary {
  return async (options) => {
    const studyLogs = await repository.findAll(options)

    return {
      studyLogs,
      totalMinutes: calculateTotalStudyMinutes(studyLogs),
    }
  }
}
