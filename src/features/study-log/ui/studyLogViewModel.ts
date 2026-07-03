import type { StudyLogSummary } from '../application/use-cases/getStudyLogSummary'

export type StudyLogListItemViewModel = Readonly<{
  id: string
  topic: string
  durationMinutes: number
  durationLabel: string
  durationInputValue: string
  studiedOnLabel: string
  studiedOnInputValue: string
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
      studiedOnLabel:
        studyLog.studiedOn === null
          ? '日付未設定'
          : studyLog.studiedOn.replace(
              /^(\d{4})-(\d{2})-(\d{2})$/,
              (_, year: string, month: string, day: string) =>
                `${year}年${Number(month)}月${Number(day)}日`,
            ),
      studiedOnInputValue: studyLog.studiedOn ?? '',
    })),
    totalDurationLabel: `${summary.totalMinutes}分`,
  }
}
