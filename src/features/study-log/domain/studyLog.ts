export type StudyLog = Readonly<{
  id: string
  topic: string
  durationMinutes: number
}>

export function calculateTotalStudyMinutes(
  studyLogs: readonly StudyLog[],
): number {
  return studyLogs.reduce(
    (total, studyLog) => total + studyLog.durationMinutes,
    0,
  )
}
