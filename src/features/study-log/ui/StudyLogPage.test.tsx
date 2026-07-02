import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  calculateTotalStudyMinutes,
  createStudyLog,
  type StudyLog,
} from '../domain/studyLog'
import { StudyLogPage } from './StudyLogPage'

describe('StudyLogPage', () => {
  const updateStudyLog = () => Promise.resolve()

  it('取得した学習ログと合計時間を表示する', async () => {
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [
          createStudyLog({ id: '1', topic: 'React', durationMinutes: 45 }),
          createStudyLog({
            id: '2',
            topic: 'TypeScript',
            durationMinutes: 30,
          }),
        ],
        totalMinutes: 75,
      })

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: '学習ログ' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('75分')).toBeInTheDocument()
  })

  it('取得に失敗したらエラーを表示する', async () => {
    const getStudyLogSummary = () => Promise.reject(new Error('failed'))

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '学習ログを読み込めませんでした。',
    )
  })

  it('学習ログが0件なら空状態を表示する', async () => {
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [],
        totalMinutes: 0,
      })

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    expect(
      await screen.findByText(
        'まだ学習ログがありません。最初の記録を追加しましょう。',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('学習内容で一覧を絞り込む', async () => {
    const user = userEvent.setup()
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [
          createStudyLog({ id: '1', topic: 'React', durationMinutes: 45 }),
          createStudyLog({
            id: '2',
            topic: 'TypeScript',
            durationMinutes: 30,
          }),
        ],
        totalMinutes: 75,
      })

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await screen.findByText('React')
    await user.type(screen.getByLabelText('学習内容を絞り込む'), 'Type')

    expect(screen.queryByText('React')).not.toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('詳細から学習ログを編集して再読み込みする', async () => {
    const user = userEvent.setup()
    let studyLogs: StudyLog[] = [
      createStudyLog({
        id: 'type-modeling',
        topic: 'TypeScript',
        durationMinutes: 30,
      }),
    ]
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs,
        totalMinutes: calculateTotalStudyMinutes(studyLogs),
      })
    const updateStudyLog = vi.fn((updatedStudyLog: StudyLog) => {
      studyLogs = studyLogs.map((studyLog) =>
        studyLog.id === updatedStudyLog.id ? updatedStudyLog : studyLog,
      )
      return Promise.resolve()
    })

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await user.click(
      await screen.findByRole('button', { name: 'TypeScript 30分' }),
    )
    await user.click(screen.getByRole('button', { name: '編集する' }))

    const topicInput = screen.getByLabelText('学習内容')
    const durationInput = screen.getByLabelText('学習時間（分）')
    await user.clear(topicInput)
    await user.type(topicInput, '型モデリング')
    await user.clear(durationInput)
    await user.type(durationInput, '90')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(updateStudyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'type-modeling',
        topic: '型モデリング',
        durationMinutes: 90,
      }),
    )
    expect(
      await screen.findByRole('button', { name: '型モデリング 90分' }),
    ).toBeInTheDocument()
  })

  it('不正なフォーム入力を保存せずエラーを表示する', async () => {
    const user = userEvent.setup()
    const studyLog = createStudyLog({
      id: 'type-modeling',
      topic: 'TypeScript',
      durationMinutes: 30,
    })
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [studyLog],
        totalMinutes: 30,
      })
    const updateStudyLog = vi.fn(() => Promise.resolve())

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await user.click(
      await screen.findByRole('button', { name: 'TypeScript 30分' }),
    )
    await user.click(screen.getByRole('button', { name: '編集する' }))
    await user.clear(screen.getByLabelText('学習内容'))
    await user.clear(screen.getByLabelText('学習時間（分）'))
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(screen.getByText('学習内容を入力してください。')).toBeInTheDocument()
    expect(screen.getByText('学習時間を入力してください。')).toBeInTheDocument()
    expect(updateStudyLog).not.toHaveBeenCalled()
  })

  it('保存に失敗したら入力値を残してエラーを表示する', async () => {
    const user = userEvent.setup()
    const studyLog = createStudyLog({
      id: 'type-modeling',
      topic: 'TypeScript',
      durationMinutes: 30,
    })
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [studyLog],
        totalMinutes: 30,
      })
    const updateStudyLog = vi.fn(() => Promise.reject(new Error('save failed')))

    render(
      <StudyLogPage
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await user.click(
      await screen.findByRole('button', { name: 'TypeScript 30分' }),
    )
    await user.click(screen.getByRole('button', { name: '編集する' }))
    const topicInput = screen.getByLabelText('学習内容')
    await user.clear(topicInput)
    await user.type(topicInput, '型モデリング')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '学習ログを保存できませんでした。',
    )
    expect(screen.getByLabelText('学習内容')).toHaveValue('型モデリング')
  })
})
