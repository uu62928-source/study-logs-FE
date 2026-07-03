import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useStudyLogInteraction } from './useStudyLogInteraction'

const validValues = {
  topic: 'TypeScript',
  durationMinutes: '30',
}

function renderInteractionHook({
  addStudyLog = vi.fn(() => Promise.resolve()),
  updateStudyLog = vi.fn(() => Promise.resolve()),
} = {}) {
  return {
    addStudyLog,
    updateStudyLog,
    ...renderHook(() =>
      useStudyLogInteraction({
        addStudyLog,
        updateStudyLog,
        createId: () => 'new-study-log',
      }),
    ),
  }
}

describe('useStudyLogInteraction', () => {
  it('新しいIDを生成して学習ログを追加する', async () => {
    const { addStudyLog, updateStudyLog, result } = renderInteractionHook()

    act(() => {
      result.current.startCreating()
      result.current.changeFormValue('topic', 'React')
      result.current.changeFormValue('durationMinutes', '45')
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(addStudyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-study-log',
        topic: 'React',
        durationMinutes: 45,
      }),
    )
    expect(updateStudyLog).not.toHaveBeenCalled()
  })

  it('入力値を検証して既存の学習ログを更新する', async () => {
    const { addStudyLog, updateStudyLog, result } = renderInteractionHook()

    act(() => {
      result.current.startEditing('type-modeling', validValues)
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(updateStudyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'type-modeling',
        topic: 'TypeScript',
        durationMinutes: 30,
      }),
    )
    expect(addStudyLog).not.toHaveBeenCalled()
    expect(result.current.interaction.editor).toEqual({
      status: 'closed',
    })
  })

  it('入力値が不正なら保存せずエラーを状態へ反映する', async () => {
    const { addStudyLog, updateStudyLog, result } = renderInteractionHook()

    act(() => {
      result.current.startEditing('type-modeling', {
        topic: '',
        durationMinutes: '',
      })
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(addStudyLog).not.toHaveBeenCalled()
    expect(updateStudyLog).not.toHaveBeenCalled()
    expect(result.current.interaction.editor).toEqual({
      status: 'editing',
      target: {
        mode: 'update',
        studyLogId: 'type-modeling',
      },
      values: { topic: '', durationMinutes: '' },
      errors: {
        topic: '学習内容を入力してください。',
        durationMinutes: '学習時間を入力してください。',
      },
    })
  })

  it('保存に失敗したら目的と入力値を残して保存エラーにする', async () => {
    const updateStudyLog = vi.fn(() => Promise.reject(new Error('save failed')))
    const { result } = renderInteractionHook({ updateStudyLog })

    act(() => {
      result.current.startEditing('type-modeling', validValues)
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(result.current.interaction.editor).toEqual({
      status: 'save-error',
      target: {
        mode: 'update',
        studyLogId: 'type-modeling',
      },
      values: validValues,
      message: '学習ログを保存できませんでした。',
    })
  })
})
