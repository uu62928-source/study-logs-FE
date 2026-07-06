import type {
  StudyLogRepository,
  StudyLogRequestOptions,
} from '../application/ports/StudyLogRepository'
import {
  createStudyLog,
  type StudyLog,
  type StudyLogId,
} from '../domain/studyLog'
import {
  parseErrorCode,
  parseStudyLogDto,
  parseStudyLogsDto,
  type StudyLogDto,
} from './studyLogDto'

type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

function fetchFromGlobal(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init)
}

export class StudyLogApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, code: string | null) {
    super(`学習ログAPIへのリクエストに失敗しました。（${status}）`)
    this.name = 'StudyLogApiError'
    this.status = status
    this.code = code
  }
}

export class InvalidStudyLogResponseError extends Error {
  constructor() {
    super('学習ログAPIのレスポンス形式が不正です。')
    this.name = 'InvalidStudyLogResponseError'
  }
}

function toDto(studyLog: StudyLog): StudyLogDto {
  return {
    id: studyLog.id,
    topic: studyLog.topic,
    duration_minutes: studyLog.durationMinutes,
    studied_on: studyLog.studiedOn,
  }
}

function toDomain(dto: StudyLogDto): StudyLog {
  try {
    return createStudyLog({
      id: dto.id,
      topic: dto.topic,
      durationMinutes: dto.duration_minutes,
      studiedOn: dto.studied_on,
    })
  } catch {
    throw new InvalidStudyLogResponseError()
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new InvalidStudyLogResponseError()
  }
}

export class HttpStudyLogRepository implements StudyLogRepository {
  readonly #baseUrl: string
  readonly #fetch: FetchPort

  constructor(baseUrl: string, fetcher: FetchPort = fetchFromGlobal) {
    this.#baseUrl = baseUrl.replace(/\/+$/, '')
    this.#fetch = fetcher
  }

  async findAll(
    options?: StudyLogRequestOptions,
  ): Promise<readonly StudyLog[]> {
    const init =
      options?.signal === undefined ? undefined : { signal: options.signal }
    const response = await this.#request('/study-logs', init, 200)
    const json = await readJson(response)

    try {
      return parseStudyLogsDto(json).map(toDomain)
    } catch (error) {
      if (error instanceof InvalidStudyLogResponseError) {
        throw error
      }

      throw new InvalidStudyLogResponseError()
    }
  }

  async add(studyLog: StudyLog): Promise<void> {
    const response = await this.#request(
      '/study-logs',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toDto(studyLog)),
      },
      201,
    )

    await this.#validateStudyLogResponse(response)
  }

  async save(studyLog: StudyLog): Promise<void> {
    const response = await this.#request(
      `/study-logs/${encodeURIComponent(studyLog.id)}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toDto(studyLog)),
      },
      200,
    )

    await this.#validateStudyLogResponse(response)
  }

  async remove(studyLogId: StudyLogId): Promise<void> {
    await this.#request(
      `/study-logs/${encodeURIComponent(studyLogId)}`,
      { method: 'DELETE' },
      204,
    )
  }

  async #request(
    path: string,
    init: RequestInit | undefined,
    expectedStatus: number,
  ): Promise<Response> {
    const response = await this.#fetch(`${this.#baseUrl}${path}`, init)

    if (!response.ok) {
      let code: string | null = null

      try {
        code = parseErrorCode(await response.json())
      } catch {
        // エラーレスポンス自体が不正でも、元のHTTP statusを優先する。
      }

      throw new StudyLogApiError(response.status, code)
    }

    if (response.status !== expectedStatus) {
      throw new InvalidStudyLogResponseError()
    }

    return response
  }

  async #validateStudyLogResponse(response: Response): Promise<void> {
    const json = await readJson(response)

    try {
      toDomain(parseStudyLogDto(json))
    } catch (error) {
      if (error instanceof InvalidStudyLogResponseError) {
        throw error
      }

      throw new InvalidStudyLogResponseError()
    }
  }
}
