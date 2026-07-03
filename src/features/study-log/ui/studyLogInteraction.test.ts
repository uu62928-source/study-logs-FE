import { describe, expect, it } from 'vitest'

import {
  initialStudyLogInteractionState,
  studyLogInteractionReducer,
  type EditorTarget,
  type StudyLogInteractionState,
} from './studyLogInteraction'

const formValues = {
  topic: 'TypeScript',
  durationMinutes: '30',
  studiedOn: '2026-07-03',
}
const updateTarget: EditorTarget = {
  mode: 'update',
  studyLogId: 'type-modeling',
}
const idleDeletion = { status: 'idle' } as const

describe('studyLogInteractionReducer', () => {
  it('新規作成を開始すると新しいIDと空の入力値を保持する', () => {
    expect(
      studyLogInteractionReducer(initialStudyLogInteractionState, {
        type: 'creationStarted',
        newStudyLogId: 'new-study-log',
        studiedOn: '2026-07-03',
      }),
    ).toEqual({
      selectedStudyLogId: null,
      editor: {
        status: 'editing',
        target: {
          mode: 'create',
          newStudyLogId: 'new-study-log',
        },
        values: {
          topic: '',
          durationMinutes: '',
          studiedOn: '2026-07-03',
        },
        errors: {},
      },
      deletion: idleDeletion,
    })
  })

  it('学習ログを選択すると編集中の内容を閉じる', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'old-log',
      editor: {
        status: 'editing',
        target: { mode: 'update', studyLogId: 'old-log' },
        values: formValues,
        errors: {},
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'studyLogSelected',
        studyLogId: 'new-log',
      }),
    ).toEqual({
      selectedStudyLogId: 'new-log',
      editor: { status: 'closed' },
      deletion: idleDeletion,
    })
  })

  it('編集を開始すると更新対象と初期値を保持する', () => {
    expect(
      studyLogInteractionReducer(initialStudyLogInteractionState, {
        type: 'editStarted',
        studyLogId: 'type-modeling',
        values: formValues,
      }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'editing',
        target: updateTarget,
        values: formValues,
        errors: {},
      },
      deletion: idleDeletion,
    })
  })

  it('入力を変更すると以前のエラーを消す', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'editing',
        target: updateTarget,
        values: formValues,
        errors: { topic: '学習内容を入力してください。' },
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'formValueChanged',
        field: 'topic',
        value: 'React',
      }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'editing',
        target: updateTarget,
        values: { ...formValues, topic: 'React' },
        errors: {},
      },
      deletion: idleDeletion,
    })
  })

  it('保存失敗時に操作の目的と入力値を残す', () => {
    const savingState: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'saving',
        target: updateTarget,
        values: formValues,
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(savingState, {
        type: 'saveFailed',
        message: '保存できませんでした。',
      }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'save-error',
        target: updateTarget,
        values: formValues,
        message: '保存できませんでした。',
      },
      deletion: idleDeletion,
    })
  })

  it('保存失敗後に入力を変えず再保存できる', () => {
    const saveErrorState: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'save-error',
        target: updateTarget,
        values: formValues,
        message: '保存できませんでした。',
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(saveErrorState, { type: 'saveStarted' }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'saving',
        target: updateTarget,
        values: formValues,
      },
      deletion: idleDeletion,
    })
  })

  it('編集をキャンセルしても選択状態を残す', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'editing',
        target: updateTarget,
        values: formValues,
        errors: {},
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(state, { type: 'editCancelled' }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: idleDeletion,
    })
  })

  it('保存中のキャンセルを受け付けない', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'saving',
        target: updateTarget,
        values: formValues,
      },
      deletion: idleDeletion,
    }

    expect(studyLogInteractionReducer(state, { type: 'editCancelled' })).toBe(
      state,
    )
  })

  it('保存中は別の学習ログを選択できない', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: {
        status: 'saving',
        target: updateTarget,
        values: formValues,
      },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'studyLogSelected',
        studyLogId: 'another-log',
      }),
    ).toBe(state)
  })

  it('削除中は新規作成を開始できない', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: {
        status: 'deleting',
        studyLogId: 'type-modeling',
      },
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'creationStarted',
        newStudyLogId: 'new-study-log',
        studiedOn: '2026-07-03',
      }),
    ).toBe(state)
  })

  it('選択中ではない学習ログの削除を開始できない', () => {
    const state: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: idleDeletion,
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'deletionStarted',
        studyLogId: 'another-log',
      }),
    ).toBe(state)
  })

  it('削除成功時に選択を解除する', () => {
    const deletingState: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: {
        status: 'deleting',
        studyLogId: 'type-modeling',
      },
    }

    expect(
      studyLogInteractionReducer(deletingState, {
        type: 'deletionSucceeded',
      }),
    ).toEqual(initialStudyLogInteractionState)
  })

  it('削除失敗時に選択と削除対象を残す', () => {
    const deletingState: StudyLogInteractionState = {
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: {
        status: 'deleting',
        studyLogId: 'type-modeling',
      },
    }

    expect(
      studyLogInteractionReducer(deletingState, {
        type: 'deletionFailed',
        message: '削除できませんでした。',
      }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
      deletion: {
        status: 'delete-error',
        studyLogId: 'type-modeling',
        message: '削除できませんでした。',
      },
    })
  })
})
