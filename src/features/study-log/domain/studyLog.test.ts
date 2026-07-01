import { describe, expect, it } from 'vitest'

import { calculateTotalStudyMinutes, type StudyLog } from './studyLog'

describe('calculateTotalStudyMinutes', () => {
  it('学習時間の合計を計算する', () => {
    const studyLogs = [
      { id: '1', topic: 'React', durationMinutes: 45 },
      { id: '2', topic: 'TypeScript', durationMinutes: 30 },
    ] satisfies StudyLog[]

    expect(calculateTotalStudyMinutes(studyLogs)).toBe(75)
  })

  it('学習ログがなければ0を返す', () => {
    expect(calculateTotalStudyMinutes([])).toBe(0)
  })
})
