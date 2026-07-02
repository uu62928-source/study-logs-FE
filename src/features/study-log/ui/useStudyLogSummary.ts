import { useEffect, useState } from 'react'

import type {
  GetStudyLogSummary,
  StudyLogSummary,
} from '../application/use-cases/getStudyLogSummary'

type StudyLogSummaryState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'success'; summary: StudyLogSummary }>
  | Readonly<{ status: 'error'; message: string }>

export function useStudyLogSummary(
  getStudyLogSummary: GetStudyLogSummary,
): StudyLogSummaryState {
  const [state, setState] = useState<StudyLogSummaryState>({
    status: 'loading',
  })

  useEffect(() => {
    let isActive = true

    void getStudyLogSummary()
      .then((summary) => {
        if (isActive) {
          setState(
            summary.studyLogs.length === 0
              ? { status: 'empty' }
              : { status: 'success', summary },
          )
        }
      })
      .catch(() => {
        if (isActive) {
          setState({
            status: 'error',
            message: '学習ログを読み込めませんでした。',
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [getStudyLogSummary])

  return state
}
