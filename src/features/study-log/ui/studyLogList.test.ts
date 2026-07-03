import { describe, expect, it } from 'vitest'

import type { StudyLogListItemViewModel } from './studyLogViewModel'
import { sortStudyLogs } from './studyLogList'

const reactLog: StudyLogListItemViewModel = {
  id: 'react',
  topic: 'React',
  durationMinutes: 30,
  durationLabel: '30分',
  durationInputValue: '30',
  studiedOnLabel: '2026年7月3日',
  studiedOnInputValue: '2026-07-03',
}
const typeScriptLog: StudyLogListItemViewModel = {
  id: 'typescript',
  topic: 'TypeScript',
  durationMinutes: 60,
  durationLabel: '60分',
  durationInputValue: '60',
  studiedOnLabel: '2026年7月2日',
  studiedOnInputValue: '2026-07-02',
}

describe('sortStudyLogs', () => {
  it('元の配列を変更せず登録順を返す', () => {
    const studyLogs = [typeScriptLog, reactLog]

    const result = sortStudyLogs(studyLogs, 'original')

    expect(result).toEqual([typeScriptLog, reactLog])
    expect(result).not.toBe(studyLogs)
    expect(studyLogs).toEqual([typeScriptLog, reactLog])
  })

  it('学習内容の昇順に並べる', () => {
    expect(sortStudyLogs([typeScriptLog, reactLog], 'topic-asc')).toEqual([
      reactLog,
      typeScriptLog,
    ])
  })

  it('学習時間の降順に並べる', () => {
    expect(sortStudyLogs([reactLog, typeScriptLog], 'duration-desc')).toEqual([
      typeScriptLog,
      reactLog,
    ])
  })
})
