import { describe, expect, it } from 'vitest'

import { toStudyLog } from './studyLogForm'

const studiedOn = '2026-07-03'

describe('toStudyLog', () => {
  it('Form型の文字列を検証済みのDomain型へ変換する', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: ' TypeScriptの型 ',
        durationMinutes: '90',
        studiedOn,
      }),
    ).toEqual({
      ok: true,
      studyLog: {
        id: 'type-modeling',
        topic: 'TypeScriptの型',
        durationMinutes: 90,
        studiedOn,
      },
    })
  })

  it('空の学習内容と不正な時間をフィールド別に返す', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: ' ',
        durationMinutes: '1.5',
        studiedOn,
      }),
    ).toEqual({
      ok: false,
      errors: {
        topic: '学習内容を入力してください。',
        durationMinutes: '1〜1440の整数で入力してください。',
      },
    })
  })

  it.each(['1', '1440'])(
    '境界値の学習時間（%s分）をDomain型へ変換する',
    (durationMinutes) => {
      const result = toStudyLog('type-modeling', {
        topic: 'TypeScript',
        durationMinutes,
        studiedOn,
      })

      expect(result).toEqual({
        ok: true,
        studyLog: {
          id: 'type-modeling',
          topic: 'TypeScript',
          durationMinutes: Number(durationMinutes),
          studiedOn,
        },
      })
    },
  )

  it.each(['0', '-1', '1.5', '1441', 'abc'])(
    '不正な学習時間（%s）をエラーにする',
    (durationMinutes) => {
      expect(
        toStudyLog('type-modeling', {
          topic: 'TypeScript',
          durationMinutes,
          studiedOn,
        }),
      ).toEqual({
        ok: false,
        errors: {
          durationMinutes: '1〜1440の整数で入力してください。',
        },
      })
    },
  )

  it('空白だけの学習時間を必須エラーにする', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: 'TypeScript',
        durationMinutes: ' ',
        studiedOn,
      }),
    ).toEqual({
      ok: false,
      errors: {
        durationMinutes: '学習時間を入力してください。',
      },
    })
  })

  it('空の学習日を必須エラーにする', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: 'TypeScript',
        durationMinutes: '30',
        studiedOn: '',
      }),
    ).toEqual({
      ok: false,
      errors: {
        studiedOn: '学習日を入力してください。',
      },
    })
  })

  it('実在しない学習日をエラーにする', () => {
    expect(
      toStudyLog('type-modeling', {
        topic: 'TypeScript',
        durationMinutes: '30',
        studiedOn: '2026-02-31',
      }),
    ).toEqual({
      ok: false,
      errors: {
        studiedOn: '実在する日付を入力してください。',
      },
    })
  })
})
