import { describe, expect, it } from 'vitest'

import { createStudyLog } from '../domain/studyLog'
import { InMemoryStudyLogRepository } from './InMemoryStudyLogRepository'

describe('InMemoryStudyLogRepository', () => {
  it('同じIDの学習ログを更新する', async () => {
    const original = createStudyLog({
      id: 'type-modeling',
      topic: 'TypeScript',
      durationMinutes: 30,
    })
    const updated = createStudyLog({
      id: 'type-modeling',
      topic: '型モデリング',
      durationMinutes: 90,
    })
    const repository = new InMemoryStudyLogRepository([original])

    await repository.save(updated)

    await expect(repository.findAll()).resolves.toEqual([updated])
  })

  it('存在しないIDは更新できない', async () => {
    const repository = new InMemoryStudyLogRepository([])
    const studyLog = createStudyLog({
      id: 'missing',
      topic: 'TypeScript',
      durationMinutes: 30,
    })

    await expect(repository.save(studyLog)).rejects.toThrow(
      '更新対象の学習ログが見つかりません。',
    )
  })
})
