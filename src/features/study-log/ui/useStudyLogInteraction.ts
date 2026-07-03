import { useReducer } from 'react'

import type { StudyLog } from '../domain/studyLog'
import { toStudyLog, type StudyLogFormValues } from './studyLogForm'
import {
  initialStudyLogInteractionState,
  studyLogInteractionReducer,
  type StudyLogInteractionState,
} from './studyLogInteraction'

type SaveStudyLog = (studyLog: StudyLog) => Promise<void>
type DeleteStudyLog = (studyLogId: string) => Promise<void>
type CreateId = () => string
type GetToday = () => string

type UseStudyLogInteractionDependencies = Readonly<{
  addStudyLog: SaveStudyLog
  deleteStudyLog: DeleteStudyLog
  updateStudyLog: SaveStudyLog
  createId?: CreateId
  getToday?: GetToday
}>

type UseStudyLogInteractionResult = Readonly<{
  interaction: StudyLogInteractionState
  selectStudyLog: (studyLogId: string) => void
  startCreating: () => void
  startEditing: (studyLogId: string, values: StudyLogFormValues) => void
  changeFormValue: (field: keyof StudyLogFormValues, value: string) => void
  submitEdit: () => Promise<void>
  cancelEditing: () => void
  deleteSelectedStudyLog: () => Promise<void>
}>

export function useStudyLogInteraction({
  addStudyLog,
  deleteStudyLog,
  updateStudyLog,
  createId = () => crypto.randomUUID(),
  getToday = () => {
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
}: UseStudyLogInteractionDependencies): UseStudyLogInteractionResult {
  const [interaction, dispatch] = useReducer(
    studyLogInteractionReducer,
    initialStudyLogInteractionState,
  )

  function selectStudyLog(studyLogId: string) {
    dispatch({ type: 'studyLogSelected', studyLogId })
  }

  function startCreating() {
    dispatch({
      type: 'creationStarted',
      newStudyLogId: createId(),
      studiedOn: getToday(),
    })
  }

  function startEditing(studyLogId: string, values: StudyLogFormValues) {
    dispatch({ type: 'editStarted', studyLogId, values })
  }

  function changeFormValue(field: keyof StudyLogFormValues, value: string) {
    dispatch({ type: 'formValueChanged', field, value })
  }

  async function submitEdit(): Promise<void> {
    if (
      interaction.editor.status === 'closed' ||
      interaction.editor.status === 'saving'
    ) {
      return
    }

    const studyLogId =
      interaction.editor.target.mode === 'create'
        ? interaction.editor.target.newStudyLogId
        : interaction.editor.target.studyLogId
    const result = toStudyLog(studyLogId, interaction.editor.values)

    if (!result.ok) {
      dispatch({
        type: 'validationFailed',
        errors: result.errors,
      })
      return
    }

    dispatch({ type: 'saveStarted' })

    try {
      if (interaction.editor.target.mode === 'create') {
        await addStudyLog(result.studyLog)
      } else {
        await updateStudyLog(result.studyLog)
      }
      dispatch({ type: 'saveSucceeded' })
    } catch {
      dispatch({
        type: 'saveFailed',
        message: '学習ログを保存できませんでした。',
      })
    }
  }

  function cancelEditing() {
    dispatch({ type: 'editCancelled' })
  }

  async function deleteSelectedStudyLog(): Promise<void> {
    if (
      interaction.selectedStudyLogId === null ||
      interaction.editor.status !== 'closed' ||
      interaction.deletion.status === 'deleting'
    ) {
      return
    }

    const studyLogId = interaction.selectedStudyLogId
    dispatch({ type: 'deletionStarted', studyLogId })

    try {
      await deleteStudyLog(studyLogId)
      dispatch({ type: 'deletionSucceeded' })
    } catch {
      dispatch({
        type: 'deletionFailed',
        message: '学習ログを削除できませんでした。',
      })
    }
  }

  return {
    interaction,
    selectStudyLog,
    startCreating,
    startEditing,
    changeFormValue,
    submitEdit,
    cancelEditing,
    deleteSelectedStudyLog,
  }
}
