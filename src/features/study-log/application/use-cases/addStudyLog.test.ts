import { describe, expect, it, vi } from 'vitest'

import { createStudyLog } from '../../domain/studyLog'
import type { StudyLogCreator } from '../ports/StudyLogRepository'
import { createAddStudyLog } from './addStudyLog'

describe('addStudyLog', () => {
  it('検証済みの学習ログをRepositoryへ追加する', async () => {
    const studyLog = createStudyLog({
      id: 'new-study-log',
      topic: 'React',
      durationMinutes: 45,
    })
    const add = vi.fn(() => Promise.resolve())
    const repository: StudyLogCreator = { add }
    const addStudyLog = createAddStudyLog(repository)

    await addStudyLog(studyLog)

    expect(add).toHaveBeenCalledWith(studyLog)
  })
})
