import { z } from 'zod'

const studyLogDtoSchema = z.object({
  id: z.string(),
  topic: z.string(),
  duration_minutes: z.number(),
  studied_on: z.string().nullable(),
})

const studyLogsDtoSchema = z.array(studyLogDtoSchema)

const errorDtoSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export type StudyLogDto = Readonly<z.infer<typeof studyLogDtoSchema>>

export function parseStudyLogDto(value: unknown): StudyLogDto {
  return studyLogDtoSchema.parse(value)
}

export function parseStudyLogsDto(value: unknown): readonly StudyLogDto[] {
  return studyLogsDtoSchema.parse(value)
}

export function parseErrorCode(value: unknown): string | null {
  const result = errorDtoSchema.safeParse(value)
  return result.success ? result.data.code : null
}
