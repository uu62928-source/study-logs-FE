import { describe, expect, it } from 'vitest'

import { toStudyLog } from './studyLogForm'

describe('toStudyLog', () => {
  it('Form型の文字列を検証済みのDomain型へ変換する', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: ' TypeScriptの型 ',
        durationMinutes: '90',
      }),
    ).toEqual({
      ok: true,
      studyLog: {
        id: 'type-modeling',
        topic: 'TypeScriptの型',
        durationMinutes: 90,
      },
    })
  })

  it('空の学習内容と不正な時間をフィールド別に返す', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: ' ',
        durationMinutes: '1.5',
      }),
    ).toEqual({
      ok: false,
      errors: {
        topic: '学習内容を入力してください。',
        durationMinutes: '1〜1440の整数で入力してください。',
      },
    })
  })
})
