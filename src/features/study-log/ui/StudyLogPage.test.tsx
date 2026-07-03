import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateTotalStudyMinutes,
  createStudyLog,
  type StudyLog,
} from '../domain/studyLog'
import { StudyLogPage } from './StudyLogPage'

describe('StudyLogPage', () => {
  const addStudyLog = () => Promise.resolve()
  const deleteStudyLog = () => Promise.resolve()
  const updateStudyLog = () => Promise.resolve()

  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

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
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await screen.findByText('React')
    await user.type(screen.getByLabelText('学習内容を絞り込む'), 'Type')

    expect(screen.queryByText('React')).not.toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('学習内容または学習時間で一覧を並び替える', async () => {
    const user = userEvent.setup()
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [
          createStudyLog({
            id: 'typescript',
            topic: 'TypeScript',
            durationMinutes: 60,
          }),
          createStudyLog({
            id: 'react',
            topic: 'React',
            durationMinutes: 30,
          }),
        ],
        totalMinutes: 90,
      })

    render(
      <StudyLogPage
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    const list = await screen.findByRole('list')
    await user.selectOptions(screen.getByLabelText('並び順'), 'topic-asc')
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['React30分', 'TypeScript60分'])

    await user.selectOptions(screen.getByLabelText('並び順'), 'duration-desc')
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['TypeScript60分', 'React30分'])
  })

  it('空状態から新しい学習ログを追加する', async () => {
    const user = userEvent.setup()
    let studyLogs: StudyLog[] = []
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs,
        totalMinutes: calculateTotalStudyMinutes(studyLogs),
      })
    const addNewStudyLog = vi.fn((studyLog: StudyLog) => {
      studyLogs = [...studyLogs, studyLog]
      return Promise.resolve()
    })

    render(
      <StudyLogPage
        addStudyLog={addNewStudyLog}
        deleteStudyLog={deleteStudyLog}
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '新しい学習ログを追加',
      }),
    )
    await user.type(screen.getByLabelText('学習内容'), 'React')
    await user.type(screen.getByLabelText('学習時間（分）'), '45')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(addNewStudyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'React',
        durationMinutes: 45,
      }),
    )
    const [addedStudyLog] = addNewStudyLog.mock.calls[0] ?? []
    expect(addedStudyLog?.id).toBeTruthy()
    expect(
      await screen.findByRole('button', { name: 'React 45分' }),
    ).toBeInTheDocument()
  })

  it('選択した学習ログを削除して空状態へ戻る', async () => {
    const user = userEvent.setup()
    let studyLogs: StudyLog[] = [
      createStudyLog({
        id: 'type-modeling',
        topic: 'TypeScript',
        durationMinutes: 30,
        studiedOn: '2026-07-03',
      }),
    ]
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs,
        totalMinutes: calculateTotalStudyMinutes(studyLogs),
      })
    const deleteExistingStudyLog = vi.fn((studyLogId: string) => {
      studyLogs = studyLogs.filter(({ id }) => id !== studyLogId)
      return Promise.resolve()
    })

    render(
      <StudyLogPage
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteExistingStudyLog}
        getStudyLogSummary={getStudyLogSummary}
        updateStudyLog={updateStudyLog}
      />,
    )

    await user.click(
      await screen.findByRole('button', { name: 'TypeScript 30分' }),
    )
    await user.click(screen.getByRole('button', { name: '削除する' }))

    expect(deleteExistingStudyLog).toHaveBeenCalledWith('type-modeling')
    expect(
      await screen.findByText(
        'まだ学習ログがありません。最初の記録を追加しましょう。',
      ),
    ).toBeInTheDocument()
  })

  it('詳細から学習ログを編集して再読み込みする', async () => {
    const user = userEvent.setup()
    let studyLogs: StudyLog[] = [
      createStudyLog({
        id: 'type-modeling',
        topic: 'TypeScript',
        durationMinutes: 30,
        studiedOn: '2026-07-03',
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
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
      studiedOn: '2026-07-03',
    })
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [studyLog],
        totalMinutes: 30,
      })
    const updateStudyLog = vi.fn(() => Promise.resolve())

    render(
      <StudyLogPage
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
      studiedOn: '2026-07-03',
    })
    const getStudyLogSummary = () =>
      Promise.resolve({
        studyLogs: [studyLog],
        totalMinutes: 30,
      })
    const updateStudyLog = vi.fn(() => Promise.reject(new Error('save failed')))

    render(
      <StudyLogPage
        addStudyLog={addStudyLog}
        deleteStudyLog={deleteStudyLog}
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
