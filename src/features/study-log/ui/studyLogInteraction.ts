import type {
  StudyLogFormErrors,
  StudyLogFormValues,
} from './studyLogForm'

export type EditorState =
  | Readonly<{ status: 'closed' }>
  | Readonly<{
      status: 'editing'
      studyLogId: string
      values: StudyLogFormValues
      errors: StudyLogFormErrors
    }>
  | Readonly<{
      status: 'saving'
      studyLogId: string
      values: StudyLogFormValues
    }>
  | Readonly<{
      status: 'save-error'
      studyLogId: string
      values: StudyLogFormValues
      message: string
    }>

export type StudyLogInteractionState = Readonly<{
  selectedStudyLogId: string | null
  editor: EditorState
}>

export type StudyLogInteractionEvent =
  | Readonly<{ type: 'studyLogSelected'; studyLogId: string }>
  | Readonly<{
      type: 'editStarted'
      studyLogId: string
      values: StudyLogFormValues
    }>
  | Readonly<{
      type: 'formValueChanged'
      field: keyof StudyLogFormValues
      value: string
    }>
  | Readonly<{
      type: 'validationFailed'
      errors: StudyLogFormErrors
    }>
  | Readonly<{ type: 'saveStarted' }>
  | Readonly<{ type: 'saveSucceeded' }>
  | Readonly<{ type: 'saveFailed'; message: string }>
  | Readonly<{ type: 'editCancelled' }>

export const initialStudyLogInteractionState: StudyLogInteractionState = {
  selectedStudyLogId: null,
  editor: { status: 'closed' },
}

export function studyLogInteractionReducer(
  state: StudyLogInteractionState,
  event: StudyLogInteractionEvent,
): StudyLogInteractionState {
  switch (event.type) {
    case 'studyLogSelected':
      return {
        ...state,
        selectedStudyLogId: event.studyLogId,
        editor: { status: 'closed' },
      }

    case 'editStarted':
      return {
        ...state,
        editor: {
          status: 'editing',
          studyLogId: event.studyLogId,
          values: event.values,
          errors: {},
        },
      }

    case 'formValueChanged':
      if (
        state.editor.status === 'closed' ||
        state.editor.status === 'saving'
      ) {
        return state
      }

      return {
        ...state,
        editor: {
          status: 'editing',
          studyLogId: state.editor.studyLogId,
          values: {
            ...state.editor.values,
            [event.field]: event.value,
          },
          errors: {},
        },
      }

    case 'validationFailed':
      if (
        state.editor.status !== 'editing' &&
        state.editor.status !== 'save-error'
      ) {
        return state
      }

      return {
        ...state,
        editor: {
          status: 'editing',
          studyLogId: state.editor.studyLogId,
          values: state.editor.values,
          errors: event.errors,
        },
      }

    case 'saveStarted':
      if (
        state.editor.status !== 'editing' &&
        state.editor.status !== 'save-error'
      ) {
        return state
      }

      return {
        ...state,
        editor: {
          status: 'saving',
          studyLogId: state.editor.studyLogId,
          values: state.editor.values,
        },
      }

    case 'saveSucceeded':
      if (state.editor.status !== 'saving') {
        return state
      }

      return {
        ...state,
        editor: { status: 'closed' },
      }

    case 'saveFailed':
      if (state.editor.status !== 'saving') {
        return state
      }

      return {
        ...state,
        editor: {
          status: 'save-error',
          studyLogId: state.editor.studyLogId,
          values: state.editor.values,
          message: event.message,
        },
      }

    case 'editCancelled':
      if (state.editor.status === 'saving') {
        return state
      }

      return {
        ...state,
        editor: { status: 'closed' },
      }
  }
}
