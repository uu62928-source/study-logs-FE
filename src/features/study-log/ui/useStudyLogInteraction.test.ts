import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useStudyLogInteraction } from './useStudyLogInteraction'

const validValues = {
  topic: 'TypeScript',
  durationMinutes: '30',
}

describe('useStudyLogInteraction', () => {
  it('入力値を検証して学習ログを保存する', async () => {
    const saveStudyLog = vi.fn(() => Promise.resolve())
    const { result } = renderHook(() =>
      useStudyLogInteraction(saveStudyLog),
    )

    act(() => {
      result.current.startEditing('type-modeling', validValues)
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(saveStudyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'type-modeling',
        topic: 'TypeScript',
        durationMinutes: 30,
      }),
    )
    expect(result.current.interaction.editor).toEqual({
      status: 'closed',
    })
  })

  it('入力値が不正なら保存せずエラーを状態へ反映する', async () => {
    const saveStudyLog = vi.fn(() => Promise.resolve())
    const { result } = renderHook(() =>
      useStudyLogInteraction(saveStudyLog),
    )

    act(() => {
      result.current.startEditing('type-modeling', {
        topic: '',
        durationMinutes: '',
      })
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(saveStudyLog).not.toHaveBeenCalled()
    expect(result.current.interaction.editor).toEqual({
      status: 'editing',
      studyLogId: 'type-modeling',
      values: { topic: '', durationMinutes: '' },
      errors: {
        topic: '学習内容を入力してください。',
        durationMinutes: '学習時間を入力してください。',
      },
    })
  })

  it('保存に失敗したら入力値を残して保存エラーにする', async () => {
    const saveStudyLog = vi.fn(() =>
      Promise.reject(new Error('save failed')),
    )
    const { result } = renderHook(() =>
      useStudyLogInteraction(saveStudyLog),
    )

    act(() => {
      result.current.startEditing('type-modeling', validValues)
    })

    await act(async () => {
      await result.current.submitEdit()
    })

    expect(result.current.interaction.editor).toEqual({
      status: 'save-error',
      studyLogId: 'type-modeling',
      values: validValues,
      message: '学習ログを保存できませんでした。',
    })
  })
})
