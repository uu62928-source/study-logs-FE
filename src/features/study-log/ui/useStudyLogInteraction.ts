import { useReducer } from 'react'

import type { StudyLog } from '../domain/studyLog'
import {
  toStudyLog,
  type StudyLogFormValues,
} from './studyLogForm'
import {
  initialStudyLogInteractionState,
  studyLogInteractionReducer,
  type StudyLogInteractionState,
} from './studyLogInteraction'

type SaveStudyLog = (studyLog: StudyLog) => Promise<void>

type UseStudyLogInteractionResult = Readonly<{
  interaction: StudyLogInteractionState
  selectStudyLog: (studyLogId: string) => void
  startEditing: (
    studyLogId: string,
    values: StudyLogFormValues,
  ) => void
  changeFormValue: (
    field: keyof StudyLogFormValues,
    value: string,
  ) => void
  submitEdit: () => Promise<void>
  cancelEditing: () => void
}>

export function useStudyLogInteraction(
  saveStudyLog: SaveStudyLog | undefined,
): UseStudyLogInteractionResult {
  const [interaction, dispatch] = useReducer(
    studyLogInteractionReducer,
    initialStudyLogInteractionState,
  )

  function selectStudyLog(studyLogId: string) {
    dispatch({ type: 'studyLogSelected', studyLogId })
  }

  function startEditing(
    studyLogId: string,
    values: StudyLogFormValues,
  ) {
    dispatch({ type: 'editStarted', studyLogId, values })
  }

  function changeFormValue(
    field: keyof StudyLogFormValues,
    value: string,
  ) {
    dispatch({ type: 'formValueChanged', field, value })
  }

  async function submitEdit(): Promise<void> {
    if (
      saveStudyLog === undefined ||
      interaction.editor.status === 'closed' ||
      interaction.editor.status === 'saving'
    ) {
      return
    }

    const result = toStudyLog(
      interaction.editor.studyLogId,
      interaction.editor.values,
    )

    if (!result.ok) {
      dispatch({
        type: 'validationFailed',
        errors: result.errors,
      })
      return
    }

    dispatch({ type: 'saveStarted' })

    try {
      await saveStudyLog(result.studyLog)
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
    startEditing,
    changeFormValue,
    submitEdit,
    cancelEditing,
  }
}
