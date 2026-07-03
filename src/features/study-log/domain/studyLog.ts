declare const studyLogIdBrand: unique symbol
declare const studyDurationMinutesBrand: unique symbol
declare const studyDateBrand: unique symbol

export type StudyLogId = string & {
  readonly [studyLogIdBrand]: 'StudyLogId'
}

export type StudyDurationMinutes = number & {
  readonly [studyDurationMinutesBrand]: 'StudyDurationMinutes'
}

export type StudyDate = string & {
  readonly [studyDateBrand]: 'StudyDate'
}

export type StudyLog = Readonly<{
  id: StudyLogId
  topic: string
  durationMinutes: StudyDurationMinutes
  studiedOn: StudyDate | null
}>

type CreateStudyLogInput = Readonly<{
  id: string
  topic: string
  durationMinutes: number
  studiedOn?: string | null
}>

export function createStudyLogId(id: string): StudyLogId {
  const normalizedId = id.trim()

  if (normalizedId.length === 0) {
    throw new Error('学習ログIDは必須です。')
  }

  return normalizedId as StudyLogId
}

export function createStudyDate(value: string): StudyDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (match === null) {
    throw new Error('学習日は実在するYYYY-MM-DD形式で指定してください。')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    year < 1000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('学習日は実在するYYYY-MM-DD形式で指定してください。')
  }

  return value as StudyDate
}

export function createStudyLog({
  id,
  topic,
  durationMinutes,
  studiedOn,
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
    studiedOn:
      studiedOn === undefined || studiedOn === null
        ? null
        : createStudyDate(studiedOn),
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
