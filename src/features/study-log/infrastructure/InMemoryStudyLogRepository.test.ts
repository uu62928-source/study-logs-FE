import { describe, expect, it } from 'vitest'

import { createStudyLog } from '../domain/studyLog'
import { InMemoryStudyLogRepository } from './InMemoryStudyLogRepository'

describe('InMemoryStudyLogRepository', () => {
  it('新しいIDの学習ログを追加する', async () => {
    const studyLog = createStudyLog({
      id: 'new-study-log',
      topic: 'React',
      durationMinutes: 45,
    })
    const repository = new InMemoryStudyLogRepository([])

    await repository.add(studyLog)

    await expect(repository.findAll()).resolves.toEqual([studyLog])
  })

  it('同じIDの学習ログは追加できない', async () => {
    const studyLog = createStudyLog({
      id: 'type-modeling',
      topic: 'TypeScript',
      durationMinutes: 30,
    })
    const repository = new InMemoryStudyLogRepository([studyLog])

    await expect(repository.add(studyLog)).rejects.toThrow(
      '同じIDの学習ログが存在します。',
    )
  })

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
