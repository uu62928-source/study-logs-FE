import { describe, expect, it } from 'vitest'

import { createStudyLog } from '../domain/studyLog'
import { toStudyLogSummaryViewModel } from './studyLogViewModel'

describe('toStudyLogSummaryViewModel', () => {
  it('Domainの値を画面表示用の文字列へ変換する', () => {
    const summary = {
      studyLogs: [
        createStudyLog({
          id: 'type-modeling',
          topic: '型モデリング',
          durationMinutes: 90,
        }),
      ],
      totalMinutes: 90,
    }

    expect(toStudyLogSummaryViewModel(summary)).toEqual({
      studyLogs: [
        {
          id: 'type-modeling',
          topic: '型モデリング',
          durationMinutes: 90,
          durationLabel: '90分',
          durationInputValue: '90',
        },
      ],
      totalDurationLabel: '90分',
    })
  })
})
