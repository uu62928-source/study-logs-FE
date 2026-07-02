import { describe, expect, it, vi } from 'vitest'

import { createStudyLog } from '../../domain/studyLog'
import type { StudyLogWriter } from '../ports/StudyLogRepository'
import { createUpdateStudyLog } from './updateStudyLog'

describe('updateStudyLog', () => {
  it('検証済みの学習ログをRepositoryへ保存する', async () => {
    const studyLog = createStudyLog({
      id: 'type-modeling',
      topic: '型モデリング',
      durationMinutes: 90,
    })
    const save = vi.fn(() => Promise.resolve())
    const repository: StudyLogWriter = { save }
    const updateStudyLog = createUpdateStudyLog(repository)

    await updateStudyLog(studyLog)

    expect(save).toHaveBeenCalledWith(studyLog)
  })
})
