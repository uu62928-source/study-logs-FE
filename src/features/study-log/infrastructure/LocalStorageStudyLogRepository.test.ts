import { describe, expect, it } from 'vitest'

import { createStudyLog } from '../domain/studyLog'
import { LocalStorageStudyLogRepository } from './LocalStorageStudyLogRepository'

class MemoryStorage {
  readonly #values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }
}

const storageKey = 'study-logs'
const initialStudyLog = createStudyLog({
  id: 'initial',
  topic: 'TypeScript',
  durationMinutes: 30,
})

describe('LocalStorageStudyLogRepository', () => {
  it('保存データがなければ初期データを返す', async () => {
    const repository = new LocalStorageStudyLogRepository(
      new MemoryStorage(),
      storageKey,
      [initialStudyLog],
    )

    await expect(repository.findAll()).resolves.toEqual([initialStudyLog])
  })

  it('追加した学習ログを別のRepositoryから復元できる', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageStudyLogRepository(storage, storageKey, [
      initialStudyLog,
    ])
    const addedStudyLog = createStudyLog({
      id: 'react',
      topic: 'React',
      durationMinutes: 45,
    })

    await repository.add(addedStudyLog)

    const restoredRepository = new LocalStorageStudyLogRepository(
      storage,
      storageKey,
      [],
    )
    await expect(restoredRepository.findAll()).resolves.toEqual([
      initialStudyLog,
      addedStudyLog,
    ])
  })

  it('既存の学習ログを更新して保存する', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageStudyLogRepository(storage, storageKey, [
      initialStudyLog,
    ])
    const updatedStudyLog = createStudyLog({
      id: 'initial',
      topic: '型モデリング',
      durationMinutes: 90,
    })

    await repository.save(updatedStudyLog)

    await expect(repository.findAll()).resolves.toEqual([updatedStudyLog])
  })

  it('削除後の空配列を保存して復元する', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageStudyLogRepository(storage, storageKey, [
      initialStudyLog,
    ])

    await repository.remove(initialStudyLog.id)

    const restoredRepository = new LocalStorageStudyLogRepository(
      storage,
      storageKey,
      [initialStudyLog],
    )
    await expect(restoredRepository.findAll()).resolves.toEqual([])
  })

  it('JSONが壊れていれば読み込みに失敗する', async () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey, '{ broken json')
    const repository = new LocalStorageStudyLogRepository(
      storage,
      storageKey,
      [],
    )

    await expect(repository.findAll()).rejects.toThrow(SyntaxError)
  })

  it('保存形式が不正なら読み込みに失敗する', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        studyLogs: [
          {
            id: 'invalid',
            topic: null,
            durationMinutes: '30',
          },
        ],
      }),
    )
    const repository = new LocalStorageStudyLogRepository(
      storage,
      storageKey,
      [],
    )

    await expect(repository.findAll()).rejects.toThrow(
      '保存された学習ログの形式が不正です。',
    )
  })

  it('未対応のバージョンなら読み込みに失敗する', async () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey, JSON.stringify({ version: 2, studyLogs: [] }))
    const repository = new LocalStorageStudyLogRepository(
      storage,
      storageKey,
      [],
    )

    await expect(repository.findAll()).rejects.toThrow(
      '保存された学習ログの形式が不正です。',
    )
  })
})
