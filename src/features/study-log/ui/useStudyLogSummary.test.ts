import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type {
  GetStudyLogSummary,
  StudyLogSummary,
} from '../application/use-cases/getStudyLogSummary'
import { createStudyLog } from '../domain/studyLog'
import { useStudyLogSummary } from './useStudyLogSummary'

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe('useStudyLogSummary', () => {
  it('古いresponseが新しい一覧を上書きしない', async () => {
    const firstRequest = createDeferred<StudyLogSummary>()
    const secondRequest = createDeferred<StudyLogSummary>()
    const signals: AbortSignal[] = []
    let requestCount = 0
    const getStudyLogSummary: GetStudyLogSummary = (options) => {
      if (options?.signal !== undefined) {
        signals.push(options.signal)
      }

      const request = requestCount === 0 ? firstRequest : secondRequest
      requestCount += 1
      return request.promise
    }
    const { result } = renderHook(() => useStudyLogSummary(getStudyLogSummary))

    act(() => {
      result.current.reload()
    })

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)

    secondRequest.resolve({
      studyLogs: [
        createStudyLog({
          id: 'new',
          topic: '新しいレスポンス',
          durationMinutes: 60,
        }),
      ],
      totalMinutes: 60,
    })

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'success',
        summary: {
          studyLogs: [{ id: 'new' }],
        },
      })
    })

    firstRequest.resolve({
      studyLogs: [
        createStudyLog({
          id: 'old',
          topic: '古いレスポンス',
          durationMinutes: 30,
        }),
      ],
      totalMinutes: 30,
    })

    await act(async () => {
      await firstRequest.promise
    })

    expect(result.current.state).toMatchObject({
      status: 'success',
      summary: {
        studyLogs: [{ id: 'new' }],
      },
    })
  })
})
