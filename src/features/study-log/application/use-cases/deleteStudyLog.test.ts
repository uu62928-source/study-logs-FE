import { describe, expect, it, vi } from 'vitest'

import type { StudyLogDeleter } from '../ports/StudyLogRepository'
import { createDeleteStudyLog } from './deleteStudyLog'

describe('deleteStudyLog', () => {
  it('検証したIDをRepositoryへ渡して削除する', async () => {
    const remove = vi.fn(() => Promise.resolve())
    const repository: StudyLogDeleter = { remove }
    const deleteStudyLog = createDeleteStudyLog(repository)

    await deleteStudyLog(' type-modeling ')

    expect(remove).toHaveBeenCalledWith('type-modeling')
  })
})
