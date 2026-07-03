import type { StudyLogFormErrors, StudyLogFormValues } from './studyLogForm'

export type EditorState =
  | Readonly<{ status: 'closed' }>
  | Readonly<{
      status: 'editing'
      target: EditorTarget
      values: StudyLogFormValues
      errors: StudyLogFormErrors
    }>
  | Readonly<{
      status: 'saving'
      target: EditorTarget
      values: StudyLogFormValues
    }>
  | Readonly<{
      status: 'save-error'
      target: EditorTarget
      values: StudyLogFormValues
      message: string
    }>

export type EditorTarget =
  | Readonly<{ mode: 'create'; newStudyLogId: string }>
  | Readonly<{ mode: 'update'; studyLogId: string }>

export type DeletionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'deleting'; studyLogId: string }>
  | Readonly<{
      status: 'delete-error'
      studyLogId: string
      message: string
    }>

export type StudyLogInteractionState = Readonly<{
  selectedStudyLogId: string | null
  editor: EditorState
  deletion: DeletionState
}>

export type StudyLogInteractionEvent =
  | Readonly<{ type: 'studyLogSelected'; studyLogId: string }>
  | Readonly<{
      type: 'creationStarted'
      newStudyLogId: string
      studiedOn: string
    }>
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
  | Readonly<{ type: 'deletionStarted'; studyLogId: string }>
  | Readonly<{ type: 'deletionSucceeded' }>
  | Readonly<{ type: 'deletionFailed'; message: string }>

export const initialStudyLogInteractionState: StudyLogInteractionState = {
  selectedStudyLogId: null,
  editor: { status: 'closed' },
  deletion: { status: 'idle' },
}

export function studyLogInteractionReducer(
  state: StudyLogInteractionState,
  event: StudyLogInteractionEvent,
): StudyLogInteractionState {
  switch (event.type) {
    case 'studyLogSelected':
      if (
        state.editor.status === 'saving' ||
        state.deletion.status === 'deleting'
      ) {
        return state
      }

      return {
        ...state,
        selectedStudyLogId: event.studyLogId,
        editor: { status: 'closed' },
        deletion: { status: 'idle' },
      }

    case 'creationStarted':
      if (
        state.editor.status === 'saving' ||
        state.deletion.status === 'deleting'
      ) {
        return state
      }

      return {
        ...state,
        selectedStudyLogId: null,
        deletion: { status: 'idle' },
        editor: {
          status: 'editing',
          target: {
            mode: 'create',
            newStudyLogId: event.newStudyLogId,
          },
          values: {
            topic: '',
            durationMinutes: '',
            studiedOn: event.studiedOn,
          },
          errors: {},
        },
      }

    case 'editStarted':
      if (
        state.editor.status === 'saving' ||
        state.deletion.status === 'deleting'
      ) {
        return state
      }

      return {
        ...state,
        selectedStudyLogId: event.studyLogId,
        deletion: { status: 'idle' },
        editor: {
          status: 'editing',
          target: {
            mode: 'update',
            studyLogId: event.studyLogId,
          },
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
          target: state.editor.target,
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
          target: state.editor.target,
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
          target: state.editor.target,
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
          target: state.editor.target,
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

    case 'deletionStarted':
      if (
        state.editor.status !== 'closed' ||
        state.deletion.status === 'deleting' ||
        state.selectedStudyLogId !== event.studyLogId
      ) {
        return state
      }

      return {
        ...state,
        deletion: {
          status: 'deleting',
          studyLogId: event.studyLogId,
        },
      }

    case 'deletionSucceeded':
      if (state.deletion.status !== 'deleting') {
        return state
      }

      return {
        selectedStudyLogId: null,
        editor: { status: 'closed' },
        deletion: { status: 'idle' },
      }

    case 'deletionFailed':
      if (state.deletion.status !== 'deleting') {
        return state
      }

      return {
        ...state,
        deletion: {
          status: 'delete-error',
          studyLogId: state.deletion.studyLogId,
          message: event.message,
        },
      }
  }
}
