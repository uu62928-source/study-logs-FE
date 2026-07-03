import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useStudyLogInteraction } from './useStudyLogInteraction'

const validValues = {
  topic: 'TypeScript',
  durationMinutes: '30',
  studiedOn: '2026-07-03',
}

function renderInteractionHook({
  addStudyLog = vi.fn(() => Promise.resolve()),
  deleteStudyLog = vi.fn(() => Promise.resolve()),
  updateStudyLog = vi.fn(() => Promise.resolve()),
} = {}) {
  return {
    addStudyLog,
    deleteStudyLog,
    updateStudyLog,
    ...renderHook(() =>
      useStudyLogInteraction({
        addStudyLog,
        deleteStudyLog,
        updateStudyLog,
        createId: () => 'new-study-log',
        getToday: () => '2026-07-03',
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
        studiedOn: '2026-07-03',
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
        studiedOn: '2026-07-03',
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
        studiedOn: '2026-07-03',
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
      values: {
        topic: '',
        durationMinutes: '',
        studiedOn: '2026-07-03',
      },
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

  it('選択中の学習ログを削除して選択を解除する', async () => {
    const { deleteStudyLog, result } = renderInteractionHook()

    act(() => {
      result.current.selectStudyLog('type-modeling')
    })

    await act(async () => {
      await result.current.deleteSelectedStudyLog()
    })

    expect(deleteStudyLog).toHaveBeenCalledWith('type-modeling')
    expect(result.current.interaction).toEqual({
      selectedStudyLogId: null,
      editor: { status: 'closed' },
      deletion: { status: 'idle' },
    })
  })

  it('削除失敗時に選択を残してエラーにする', async () => {
    const deleteStudyLog = vi.fn(() =>
      Promise.reject(new Error('delete failed')),
    )
    const { result } = renderInteractionHook({ deleteStudyLog })

    act(() => {
      result.current.selectStudyLog('type-modeling')
    })

    await act(async () => {
      await result.current.deleteSelectedStudyLog()
    })

    expect(result.current.interaction).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: {
        status: 'delete-error',
        studyLogId: 'type-modeling',
        message: '学習ログを削除できませんでした。',
      },
    })
  })
})
