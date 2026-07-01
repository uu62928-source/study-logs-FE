import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyLogPage } from './StudyLogPage'

describe('StudyLogPage', () => {
  it('取得した学習ログと合計時間を表示する', async () => {
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [
          { id: '1', topic: 'React', durationMinutes: 45 },
          { id: '2', topic: 'TypeScript', durationMinutes: 30 },
        ],
        totalMinutes: 75,
      })

    render(<StudyLogPage getStudyLogSummary={getStudyLogSummary} />)

    expect(
      screen.getByRole('heading', { level: 1, name: '学習ログ' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('75分')).toBeInTheDocument()
  })

  it('取得に失敗したらエラーを表示する', async () => {
    const getStudyLogSummary = () => Promise.reject(new Error('failed'))

    render(<StudyLogPage getStudyLogSummary={getStudyLogSummary} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '学習ログを読み込めませんでした。',
    )
  })
})
