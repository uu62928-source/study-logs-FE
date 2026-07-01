import { describe, expect, it } from 'vitest'

import type { StudyLog } from '../../domain/studyLog'
import type { StudyLogRepository } from '../ports/StudyLogRepository'
import { createGetStudyLogSummary } from './getStudyLogSummary'

describe('getStudyLogSummary', () => {
  it('リポジトリから取得したログと合計時間を返す', async () => {
    const studyLogs = [
      { id: '1', topic: '設計', durationMinutes: 40 },
      { id: '2', topic: 'テスト', durationMinutes: 20 },
    ] satisfies StudyLog[]
    const repository: StudyLogRepository = {
      findAll: () => Promise.resolve(studyLogs),
    }
    const getStudyLogSummary = createGetStudyLogSummary(repository)

    await expect(getStudyLogSummary()).resolves.toEqual({
      studyLogs,
      totalMinutes: 60,
    })
  })
})
