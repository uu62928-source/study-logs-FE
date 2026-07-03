declare const studyLogIdBrand: unique symbol
declare const studyDurationMinutesBrand: unique symbol

export type StudyLogId = string & {
  readonly [studyLogIdBrand]: 'StudyLogId'
}

export type StudyDurationMinutes = number & {
  readonly [studyDurationMinutesBrand]: 'StudyDurationMinutes'
}

export type StudyLog = Readonly<{
  id: StudyLogId
  topic: string
  durationMinutes: StudyDurationMinutes
}>

type CreateStudyLogInput = Readonly<{
  id: string
  topic: string
  durationMinutes: number
}>

export function createStudyLogId(id: string): StudyLogId {
  const normalizedId = id.trim()

  if (normalizedId.length === 0) {
    throw new Error('学習ログIDは必須です。')
  }

  return normalizedId as StudyLogId
}

export function createStudyLog({
  id,
  topic,
  durationMinutes,
}: CreateStudyLogInput): StudyLog {
  const normalizedTopic = topic.trim()

  if (normalizedTopic.length === 0) {
    throw new Error('学習内容は必須です。')
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 24 * 60
  ) {
    throw new Error('学習時間は1〜1440の整数で指定してください。')
  }

  return {
    id: createStudyLogId(id),
    topic: normalizedTopic,
    durationMinutes: durationMinutes as StudyDurationMinutes,
  }
}

export function calculateTotalStudyMinutes(
  studyLogs: readonly StudyLog[],
): number {
  return studyLogs.reduce(
    (total, studyLog) => total + studyLog.durationMinutes,
    0,
  )
}
