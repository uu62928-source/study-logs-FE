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
}
const updateTarget: EditorTarget = {
  mode: 'update',
  studyLogId: 'type-modeling',
}

describe('studyLogInteractionReducer', () => {
  it('新規作成を開始すると新しいIDと空の入力値を保持する', () => {
    expect(
      studyLogInteractionReducer(initialStudyLogInteractionState, {
        type: 'creationStarted',
        newStudyLogId: 'new-study-log',
      }),
    ).toEqual({
      selectedStudyLogId: null,
      editor: {
        status: 'editing',
        target: {
          mode: 'create',
          newStudyLogId: 'new-study-log',
        },
        values: { topic: '', durationMinutes: '' },
        errors: {},
      },
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
    }

    expect(
      studyLogInteractionReducer(state, {
        type: 'studyLogSelected',
        studyLogId: 'new-log',
      }),
    ).toEqual({
      selectedStudyLogId: 'new-log',
      editor: { status: 'closed' },
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
      selectedStudyLogId: null,
      editor: {
        status: 'editing',
        target: updateTarget,
        values: formValues,
        errors: {},
      },
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
    }

    expect(
      studyLogInteractionReducer(state, { type: 'editCancelled' }),
    ).toEqual({
      selectedStudyLogId: 'type-modeling',
      editor: { status: 'closed' },
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
    }

    expect(studyLogInteractionReducer(state, { type: 'editCancelled' })).toBe(
      state,
    )
  })
})
