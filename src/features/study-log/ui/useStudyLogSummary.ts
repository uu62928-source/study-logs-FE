import { useCallback, useEffect, useState } from 'react'

import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import {
  toStudyLogSummaryViewModel,
  type StudyLogViewState,
} from './studyLogViewModel'

export function useStudyLogSummary(
  getStudyLogSummary: GetStudyLogSummary,
): Readonly<{ state: StudyLogViewState; reload: () => void }> {
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<StudyLogViewState>({
    status: 'loading',
  })

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    void getStudyLogSummary({ signal: abortController.signal })
      .then((summary) => {
        if (isActive) {
          setState(
            summary.studyLogs.length === 0
              ? { status: 'empty' }
              : {
                  status: 'success',
                  summary: toStudyLogSummaryViewModel(summary),
                },
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
      abortController.abort()
    }
  }, [getStudyLogSummary, requestVersion])

  return { state, reload }
}
