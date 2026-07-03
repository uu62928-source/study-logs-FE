import type { StudyLogSummary } from '../application/use-cases/getStudyLogSummary'

export type StudyLogListItemViewModel = Readonly<{
  id: string
  topic: string
  durationMinutes: number
  durationLabel: string
  durationInputValue: string
}>

export type StudyLogSummaryViewModel = Readonly<{
  studyLogs: readonly StudyLogListItemViewModel[]
  totalDurationLabel: string
}>

export type StudyLogViewState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'success'; summary: StudyLogSummaryViewModel }>
  | Readonly<{ status: 'error'; message: string }>

export function toStudyLogSummaryViewModel(
  summary: StudyLogSummary,
): StudyLogSummaryViewModel {
  return {
    studyLogs: summary.studyLogs.map((studyLog) => ({
      id: studyLog.id,
      topic: studyLog.topic,
      durationMinutes: studyLog.durationMinutes,
      durationLabel: `${studyLog.durationMinutes}分`,
      durationInputValue: String(studyLog.durationMinutes),
    })),
    totalDurationLabel: `${summary.totalMinutes}分`,
  }
}
