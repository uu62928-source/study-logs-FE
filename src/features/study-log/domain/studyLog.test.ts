import { describe, expect, it } from 'vitest'

import {
  calculateTotalStudyMinutes,
  createStudyLog,
  type StudyLog,
} from './studyLog'

describe('calculateTotalStudyMinutes', () => {
  it('学習時間の合計を計算する', () => {
    const studyLogs = [
      createStudyLog({ id: '1', topic: 'React', durationMinutes: 45 }),
      createStudyLog({ id: '2', topic: 'TypeScript', durationMinutes: 30 }),
    ] satisfies StudyLog[]

    expect(calculateTotalStudyMinutes(studyLogs)).toBe(75)
  })

  it('学習ログがなければ0を返す', () => {
    expect(calculateTotalStudyMinutes([])).toBe(0)
  })
})

describe('createStudyLog', () => {
  it('前後の空白を除去して学習ログを生成する', () => {
    expect(
      createStudyLog({
        id: ' log-1 ',
        topic: ' TypeScript ',
        durationMinutes: 30,
      }),
    ).toEqual({
      id: 'log-1',
      topic: 'TypeScript',
      durationMinutes: 30,
    })
  })

  it.each([1, 1440])(
    '境界値の学習時間（%s分）を受け付ける',
    (durationMinutes) => {
      expect(
        createStudyLog({
          id: 'log-1',
          topic: 'TypeScript',
          durationMinutes,
        }).durationMinutes,
      ).toBe(durationMinutes)
    },
  )

  it.each([0, -1, 1.5, 1441, Number.NaN, Number.POSITIVE_INFINITY])(
    '不正な学習時間（%s分）を受け付けない',
    (durationMinutes) => {
      expect(() =>
        createStudyLog({
          id: 'log-1',
          topic: 'TypeScript',
          durationMinutes,
        }),
      ).toThrow('学習時間は1〜1440の整数で指定してください。')
    },
  )

  it('空白だけのIDを受け付けない', () => {
    expect(() =>
      createStudyLog({
        id: ' ',
        topic: 'TypeScript',
        durationMinutes: 30,
      }),
    ).toThrow('学習ログIDは必須です。')
  })

  it('空白だけの学習内容を受け付けない', () => {
    expect(() =>
      createStudyLog({
        id: 'log-1',
        topic: ' ',
        durationMinutes: 30,
      }),
    ).toThrow('学習内容は必須です。')
  })
})
