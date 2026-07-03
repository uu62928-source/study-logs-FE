import { useReducer } from 'react'

import type { StudyLog } from '../domain/studyLog'
import { toStudyLog, type StudyLogFormValues } from './studyLogForm'
import {
  initialStudyLogInteractionState,
  studyLogInteractionReducer,
  type StudyLogInteractionState,
} from './studyLogInteraction'

type SaveStudyLog = (studyLog: StudyLog) => Promise<void>
type CreateId = () => string

type UseStudyLogInteractionDependencies = Readonly<{
  addStudyLog: SaveStudyLog
  updateStudyLog: SaveStudyLog
  createId?: CreateId
}>

type UseStudyLogInteractionResult = Readonly<{
  interaction: StudyLogInteractionState
  selectStudyLog: (studyLogId: string) => void
  startCreating: () => void
  startEditing: (studyLogId: string, values: StudyLogFormValues) => void
  changeFormValue: (field: keyof StudyLogFormValues, value: string) => void
  submitEdit: () => Promise<void>
  cancelEditing: () => void
}>

export function useStudyLogInteraction({
  addStudyLog,
  updateStudyLog,
  createId = () => crypto.randomUUID(),
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

  return {
    interaction,
    selectStudyLog,
    startCreating,
    startEditing,
    changeFormValue,
    submitEdit,
    cancelEditing,
  }
}
