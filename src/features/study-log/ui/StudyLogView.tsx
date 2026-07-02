import { useMemo, useState, type FormEvent } from 'react'

import type { StudyLog } from '../domain/studyLog'
import {
  toStudyLog,
  type StudyLogFormErrors,
  type StudyLogFormValues,
} from './studyLogForm'
import type { StudyLogViewState } from './studyLogViewModel'

type StudyLogViewProps = Readonly<{
  state: StudyLogViewState
  onSaveStudyLog: (studyLog: StudyLog) => Promise<void>
}>

type EditorState =
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

export function StudyLogView({ state, onSaveStudyLog }: StudyLogViewProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedStudyLogId, setSelectedStudyLogId] = useState<string | null>(
    null,
  )
  const [editor, setEditor] = useState<EditorState>({ status: 'closed' })

  const filteredStudyLogs = useMemo(() => {
    if (state.status !== 'success') {
      return []
    }

    const normalizedQuery = filterQuery.trim().toLocaleLowerCase()

    if (normalizedQuery.length === 0) {
      return state.summary.studyLogs
    }

    return state.summary.studyLogs.filter((studyLog) =>
      studyLog.topic.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [filterQuery, state])

  const selectedStudyLog =
    state.status === 'success'
      ? state.summary.studyLogs.find(
          (studyLog) => studyLog.id === selectedStudyLogId,
        )
      : undefined

  function selectStudyLog(studyLogId: string) {
    setSelectedStudyLogId(studyLogId)
    setEditor({ status: 'closed' })
  }

  function startEditing() {
    if (selectedStudyLog === undefined) {
      return
    }

    setEditor({
      status: 'editing',
      studyLogId: selectedStudyLog.id,
      values: {
        topic: selectedStudyLog.topic,
        durationMinutes: selectedStudyLog.durationInputValue,
      },
      errors: {},
    })
  }

  function updateFormValue(field: keyof StudyLogFormValues, value: string) {
    if (editor.status === 'closed' || editor.status === 'saving') {
      return
    }

    setEditor({
      status: 'editing',
      studyLogId: editor.studyLogId,
      values: {
        ...editor.values,
        [field]: value,
      },
      errors: {},
    })
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (editor.status === 'closed' || editor.status === 'saving') {
      return
    }

    const result = toStudyLog(editor.studyLogId, editor.values)

    if (!result.ok) {
      setEditor({
        status: 'editing',
        studyLogId: editor.studyLogId,
        values: editor.values,
        errors: result.errors,
      })
      return
    }

    setEditor({
      status: 'saving',
      studyLogId: editor.studyLogId,
      values: editor.values,
    })

    try {
      await onSaveStudyLog(result.studyLog)
      setEditor({ status: 'closed' })
    } catch {
      setEditor({
        status: 'save-error',
        studyLogId: editor.studyLogId,
        values: editor.values,
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

        {state.status === 'loading' && <p>読み込み中...</p>}

        {state.status === 'error' && <p role="alert">{state.message}</p>}

        {state.status === 'empty' && (
          <p>まだ学習ログがありません。最初の記録を追加しましょう。</p>
        )}

        {state.status === 'success' && (
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
                      aria-pressed={studyLog.id === selectedStudyLogId}
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
              合計 <strong>{state.summary.totalDurationLabel}</strong>
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

                  {editor.status === 'closed' ? (
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
                          value={editor.values.topic}
                          disabled={editor.status === 'saving'}
                          aria-invalid={
                            editor.status === 'editing' &&
                            editor.errors.topic !== undefined
                          }
                          onChange={(event) =>
                            updateFormValue('topic', event.target.value)
                          }
                        />
                      </label>
                      {editor.status === 'editing' &&
                        editor.errors.topic !== undefined && (
                          <p className="field-error" role="alert">
                            {editor.errors.topic}
                          </p>
                        )}

                      <label>
                        <span>学習時間（分）</span>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          step="1"
                          value={editor.values.durationMinutes}
                          disabled={editor.status === 'saving'}
                          aria-invalid={
                            editor.status === 'editing' &&
                            editor.errors.durationMinutes !== undefined
                          }
                          onChange={(event) =>
                            updateFormValue(
                              'durationMinutes',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      {editor.status === 'editing' &&
                        editor.errors.durationMinutes !== undefined && (
                          <p className="field-error" role="alert">
                            {editor.errors.durationMinutes}
                          </p>
                        )}

                      {editor.status === 'save-error' && (
                        <p className="field-error" role="alert">
                          {editor.message}
                        </p>
                      )}

                      <div className="form-actions">
                        <button
                          type="submit"
                          disabled={editor.status === 'saving'}
                        >
                          {editor.status === 'saving'
                            ? '保存中...'
                            : '保存する'}
                        </button>
                        <button
                          type="button"
                          disabled={editor.status === 'saving'}
                          onClick={() => setEditor({ status: 'closed' })}
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
