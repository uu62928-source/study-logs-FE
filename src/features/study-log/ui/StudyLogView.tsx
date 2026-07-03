import { useReducer, useState, type FormEvent } from 'react'

import type { StudyLog } from '../domain/studyLog'
import {
  toStudyLog,
  type StudyLogFormValues,
} from './studyLogForm'
import {
  initialStudyLogInteractionState,
  studyLogInteractionReducer,
} from './studyLogInteraction'
import type {
  StudyLogListItemViewModel,
  StudyLogViewState,
} from './studyLogViewModel'

type StudyLogViewProps =
  | Exclude<StudyLogViewState, { status: 'success' }>
  | (Extract<StudyLogViewState, { status: 'success' }> &
      Readonly<{
        onSaveStudyLog: (studyLog: StudyLog) => Promise<void>
      }>)

export function StudyLogView(props: StudyLogViewProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [interaction, dispatch] = useReducer(
    studyLogInteractionReducer,
    initialStudyLogInteractionState,
  )

  const normalizedQuery = filterQuery.trim().toLocaleLowerCase()
  let filteredStudyLogs: readonly StudyLogListItemViewModel[] = []

  if (props.status === 'success') {
    filteredStudyLogs =
      normalizedQuery.length === 0
        ? props.summary.studyLogs
        : props.summary.studyLogs.filter((studyLog) =>
            studyLog.topic.toLocaleLowerCase().includes(normalizedQuery),
          )
  }

  const selectedStudyLog =
    props.status === 'success'
      ? props.summary.studyLogs.find(
          (studyLog) => studyLog.id === interaction.selectedStudyLogId,
        )
      : undefined

  function selectStudyLog(studyLogId: string) {
    dispatch({ type: 'studyLogSelected', studyLogId })
  }

  function startEditing() {
    if (selectedStudyLog === undefined) {
      return
    }

    dispatch({
      type: 'editStarted',
      studyLogId: selectedStudyLog.id,
      values: {
        topic: selectedStudyLog.topic,
        durationMinutes: selectedStudyLog.durationInputValue,
      },
    })
  }

  function updateFormValue(field: keyof StudyLogFormValues, value: string) {
    if (
      props.status !== 'success' ||
      interaction.editor.status === 'closed' ||
      interaction.editor.status === 'saving'
    ) {
      return
    }

    dispatch({ type: 'formValueChanged', field, value })
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      props.status !== 'success' ||
      interaction.editor.status === 'closed' ||
      interaction.editor.status === 'saving'
    ) {
      return
    }

    const { onSaveStudyLog } = props
    const editor = interaction.editor
    const result = toStudyLog(editor.studyLogId, editor.values)

    if (!result.ok) {
      dispatch({
        type: 'validationFailed',
        errors: result.errors,
      })
      return
    }

    dispatch({ type: 'saveStarted' })

    try {
      await onSaveStudyLog(result.studyLog)
      dispatch({ type: 'saveSucceeded' })
    } catch {
      dispatch({
        type: 'saveFailed',
        message: '学習ログを保存できませんでした。',
      })
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">Day 2 · Type Modeling</p>
      <h1>学習ログ</h1>
      <p className="lead">
        学んだことと時間を記録し、継続を見える形にするためのアプリです。
        UIから保存方法を切り離し、変更に強い境界を設計します。
      </p>

      <section className="card" aria-labelledby="today-heading">
        <h2 id="today-heading">これまでの記録</h2>

        {props.status === 'loading' && <p>読み込み中...</p>}

        {props.status === 'error' && <p role="alert">{props.message}</p>}

        {props.status === 'empty' && (
          <p>まだ学習ログがありません。最初の記録を追加しましょう。</p>
        )}

        {props.status === 'success' && (
          <>
            <label className="filter-field">
              <span>学習内容を絞り込む</span>
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="例: TypeScript"
              />
            </label>

            {filteredStudyLogs.length === 0 ? (
              <p>条件に一致する学習ログがありません。</p>
            ) : (
              <ul className="study-log-list">
                {filteredStudyLogs.map((studyLog) => (
                  <li key={studyLog.id}>
                    <button
                      type="button"
                      className="study-log-item"
                      aria-pressed={
                        studyLog.id === interaction.selectedStudyLogId
                      }
                      onClick={() => selectStudyLog(studyLog.id)}
                    >
                      <span>{studyLog.topic}</span>
                      <span>{studyLog.durationLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="total">
              合計 <strong>{props.summary.totalDurationLabel}</strong>
            </p>

            <section
              className="study-log-detail"
              aria-labelledby="detail-title"
            >
              <h2 id="detail-title">詳細</h2>

              {selectedStudyLog === undefined ? (
                <p>一覧から学習ログを選択してください。</p>
              ) : (
                <>
                  <h3>{selectedStudyLog.topic}</h3>
                  <p>学習時間：{selectedStudyLog.durationLabel}</p>

                  {interaction.editor.status === 'closed' ? (
                    <button type="button" onClick={startEditing}>
                      編集する
                    </button>
                  ) : (
                    <form
                      className="study-log-form"
                      onSubmit={(event) => {
                        void submitEdit(event)
                      }}
                    >
                      <label>
                        <span>学習内容</span>
                        <input
                          value={interaction.editor.values.topic}
                          disabled={interaction.editor.status === 'saving'}
                          aria-invalid={
                            interaction.editor.status === 'editing' &&
                            interaction.editor.errors.topic !== undefined
                          }
                          onChange={(event) =>
                            updateFormValue('topic', event.target.value)
                          }
                        />
                      </label>
                      {interaction.editor.status === 'editing' &&
                        interaction.editor.errors.topic !== undefined && (
                          <p className="field-error" role="alert">
                            {interaction.editor.errors.topic}
                          </p>
                        )}

                      <label>
                        <span>学習時間（分）</span>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          step="1"
                          value={interaction.editor.values.durationMinutes}
                          disabled={interaction.editor.status === 'saving'}
                          aria-invalid={
                            interaction.editor.status === 'editing' &&
                            interaction.editor.errors.durationMinutes !==
                              undefined
                          }
                          onChange={(event) =>
                            updateFormValue(
                              'durationMinutes',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      {interaction.editor.status === 'editing' &&
                        interaction.editor.errors.durationMinutes !==
                          undefined && (
                          <p className="field-error" role="alert">
                            {interaction.editor.errors.durationMinutes}
                          </p>
                        )}

                      {interaction.editor.status === 'save-error' && (
                        <p className="field-error" role="alert">
                          {interaction.editor.message}
                        </p>
                      )}

                      <div className="form-actions">
                        <button
                          type="submit"
                          disabled={interaction.editor.status === 'saving'}
                        >
                          {interaction.editor.status === 'saving'
                            ? '保存中...'
                            : '保存する'}
                        </button>
                        <button
                          type="button"
                          disabled={interaction.editor.status === 'saving'}
                          onClick={() => dispatch({ type: 'editCancelled' })}
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
