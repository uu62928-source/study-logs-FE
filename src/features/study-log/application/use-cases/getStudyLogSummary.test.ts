import { describe, expect, it } from 'vitest'

import { createStudyLog, type StudyLog } from '../../domain/studyLog'
import type { StudyLogReader } from '../ports/StudyLogRepository'
import { createGetStudyLogSummary } from './getStudyLogSummary'

describe('getStudyLogSummary', () => {
  it('リポジトリから取得したログと合計時間を返す', async () => {
    const studyLogs = [
      createStudyLog({ id: '1', topic: '設計', durationMinutes: 40 }),
      createStudyLog({ id: '2', topic: 'テスト', durationMinutes: 20 }),
    ] satisfies StudyLog[]
    const repository: StudyLogReader = {
      findAll: () => Promise.resolve(studyLogs),
    }
    const getStudyLogSummary = createGetStudyLogSummary(repository)

    await expect(getStudyLogSummary()).resolves.toEqual({
      studyLogs,
      totalMinutes: 60,
    })
  })

  it('一覧取得へAbortSignalを渡す', async () => {
    let receivedSignal: AbortSignal | undefined
    const repository: StudyLogReader = {
      findAll: (options) => {
        receivedSignal = options?.signal
        return Promise.resolve([])
      },
    }
    const getStudyLogSummary = createGetStudyLogSummary(repository)
    const abortController = new AbortController()

    await getStudyLogSummary({ signal: abortController.signal })

    expect(receivedSignal).toBe(abortController.signal)
  })
})
