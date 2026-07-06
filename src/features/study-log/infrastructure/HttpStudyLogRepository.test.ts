import { afterEach, describe, expect, it, vi } from 'vitest'

import { createStudyLog } from '../domain/studyLog'
import {
  HttpStudyLogRepository,
  InvalidStudyLogResponseError,
  StudyLogApiError,
} from './HttpStudyLogRepository'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const studyLogDto = {
  id: 'server-state',
  topic: 'Server State',
  duration_minutes: 60,
  studied_on: '2026-07-06',
}

const studyLog = createStudyLog({
  id: 'server-state',
  topic: 'Server State',
  durationMinutes: 60,
  studiedOn: '2026-07-06',
})

describe('HttpStudyLogRepository', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('既定のfetchをglobalThisの関数として呼び出す', async () => {
    const receivedContexts: unknown[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(function (this: unknown) {
        receivedContexts.push(this)
        return Promise.resolve(jsonResponse([]))
      }),
    )
    const repository = new HttpStudyLogRepository('http://localhost:3000')

    await repository.findAll()

    expect(receivedContexts).toEqual([globalThis])
  })

  it('一覧DTOを検証してDomainへ変換する', async () => {
    const fetcher = vi.fn(() => Promise.resolve(jsonResponse([studyLogDto])))
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000/',
      fetcher,
    )

    await expect(repository.findAll()).resolves.toEqual([studyLog])
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3000/study-logs',
      undefined,
    )
  })

  it('一覧取得のAbortSignalをfetchへ渡す', async () => {
    const fetcher = vi.fn(() => Promise.resolve(jsonResponse([])))
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )
    const abortController = new AbortController()

    await repository.findAll({ signal: abortController.signal })

    expect(fetcher).toHaveBeenCalledWith('http://localhost:3000/study-logs', {
      signal: abortController.signal,
    })
  })

  it('追加時にDomainをrequest DTOへ変換する', async () => {
    const fetcher = vi.fn(() => Promise.resolve(jsonResponse(studyLogDto, 201)))
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await repository.add(studyLog)

    expect(fetcher).toHaveBeenCalledWith('http://localhost:3000/study-logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(studyLogDto),
    })
  })

  it('更新時にIDをencodeしたURLとrequest DTOを使う', async () => {
    const studyLogWithReservedId = createStudyLog({
      id: 'react/query',
      topic: 'React Query',
      durationMinutes: 45,
      studiedOn: null,
    })
    const responseDto = {
      id: 'react/query',
      topic: 'React Query',
      duration_minutes: 45,
      studied_on: null,
    }
    const fetcher = vi.fn(() => Promise.resolve(jsonResponse(responseDto)))
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await repository.save(studyLogWithReservedId)

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3000/study-logs/react%2Fquery',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(responseDto),
      },
    )
  })

  it('削除時にDELETEを使い、204のbodyは読まない', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    )
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await repository.remove(studyLog.id)

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3000/study-logs/server-state',
      { method: 'DELETE' },
    )
  })

  it('DTOの構造が不正なら拒否する', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse([{ ...studyLogDto, duration_minutes: '60' }]),
      ),
    )
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await expect(repository.findAll()).rejects.toBeInstanceOf(
      InvalidStudyLogResponseError,
    )
  })

  it('DTOがDomainの制約に違反していれば拒否する', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse([{ ...studyLogDto, studied_on: '2026-02-31' }]),
      ),
    )
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await expect(repository.findAll()).rejects.toThrow(
      '学習ログAPIのレスポンス形式が不正です。',
    )
  })

  it('HTTP errorのstatusとcodeを保持する', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        jsonResponse(
          {
            code: 'study_log_conflict',
            message: '同じIDの学習ログが存在します。',
          },
          409,
        ),
      ),
    )
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    const result = repository.add(studyLog)

    await expect(result).rejects.toBeInstanceOf(StudyLogApiError)
    await expect(result).rejects.toMatchObject({
      status: 409,
      code: 'study_log_conflict',
    })
    await expect(result).rejects.not.toThrow('同じIDの学習ログが存在します。')
  })

  it('成功statusが契約と異なれば拒否する', async () => {
    const fetcher = vi.fn(() => Promise.resolve(jsonResponse(studyLogDto, 200)))
    const repository = new HttpStudyLogRepository(
      'http://localhost:3000',
      fetcher,
    )

    await expect(repository.add(studyLog)).rejects.toBeInstanceOf(
      InvalidStudyLogResponseError,
    )
  })
})
