import {
  createStudyDate,
  createStudyLog,
  type StudyLog,
} from '../domain/studyLog'

export type StudyLogFormValues = Readonly<{
  topic: string
  durationMinutes: string
  studiedOn: string
}>

export type StudyLogFormErrors = Readonly<
  Partial<Record<keyof StudyLogFormValues, string>>
>

export type StudyLogFormResult =
  | Readonly<{ ok: true; studyLog: StudyLog }>
  | Readonly<{ ok: false; errors: StudyLogFormErrors }>

export function toStudyLog(
  id: string,
  values: StudyLogFormValues,
): StudyLogFormResult {
  const errors: Partial<Record<keyof StudyLogFormValues, string>> = {}
  const topic = values.topic.trim()
  const durationMinutes = Number(values.durationMinutes)

  if (topic.length === 0) {
    errors.topic = '学習内容を入力してください。'
  }

  if (values.durationMinutes.trim().length === 0) {
    errors.durationMinutes = '学習時間を入力してください。'
  } else if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 24 * 60
  ) {
    errors.durationMinutes = '1〜1440の整数で入力してください。'
  }

  if (values.studiedOn.length === 0) {
    errors.studiedOn = '学習日を入力してください。'
  } else {
    try {
      createStudyDate(values.studiedOn)
    } catch {
      errors.studiedOn = '実在する日付を入力してください。'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    studyLog: createStudyLog({
      id,
      topic,
      durationMinutes,
      studiedOn: values.studiedOn,
    }),
  }
}
