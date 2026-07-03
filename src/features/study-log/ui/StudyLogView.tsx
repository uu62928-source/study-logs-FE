import { useState, type FormEvent } from 'react'

import type { StudyLog } from '../domain/studyLog'
import type { StudyLogFormValues } from './studyLogForm'
import type { EditorState } from './studyLogInteraction'
import { sortStudyLogs, type StudyLogSortOrder } from './studyLogList'
import type {
  StudyLogListItemViewModel,
  StudyLogViewState,
} from './studyLogViewModel'
import { useStudyLogInteraction } from './useStudyLogInteraction'

type StudyLogViewProps = StudyLogViewState &
  Readonly<{
    onAddStudyLog: (studyLog: StudyLog) => Promise<void>
    onDeleteStudyLog: (studyLogId: string) => Promise<void>
    onUpdateStudyLog: (studyLog: StudyLog) => Promise<void>
  }>

type StudyLogEditorFormProps = Readonly<{
  editor: Exclude<EditorState, { status: 'closed' }>
  onChange: (field: keyof StudyLogFormValues, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}>

function StudyLogEditorForm({
  editor,
  onChange,
  onSubmit,
  onCancel,
}: StudyLogEditorFormProps) {
  return (
    <form
      className="study-log-form"
      onSubmit={(event) => {
        onSubmit(event)
      }}
    >
      <label>
        <span>学習内容</span>
        <input
          value={editor.values.topic}
          disabled={editor.status === 'saving'}
          aria-invalid={
            editor.status === 'editing' && editor.errors.topic !== undefined
          }
          onChange={(event) => onChange('topic', event.target.value)}
        />
      </label>
      {editor.status === 'editing' && editor.errors.topic !== undefined && (
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
          onChange={(event) => onChange('durationMinutes', event.target.value)}
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
        <button type="submit" disabled={editor.status === 'saving'}>
          {editor.status === 'saving' ? '保存中...' : '保存する'}
        </button>
        <button
          type="button"
          disabled={editor.status === 'saving'}
          onClick={onCancel}
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}

export function StudyLogView(props: StudyLogViewProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<StudyLogSortOrder>('original')
  const {
    interaction,
    selectStudyLog,
    startCreating,
    startEditing: beginEditing,
    changeFormValue,
    submitEdit: saveEdit,
    cancelEditing,
    deleteSelectedStudyLog,
  } = useStudyLogInteraction({
    addStudyLog: props.onAddStudyLog,
    deleteStudyLog: props.onDeleteStudyLog,
    updateStudyLog: props.onUpdateStudyLog,
  })

  const normalizedQuery = filterQuery.trim().toLocaleLowerCase()
  const isMutationPending =
    interaction.editor.status === 'saving' ||
    interaction.deletion.status === 'deleting'
  let visibleStudyLogs: readonly StudyLogListItemViewModel[] = []

  if (props.status === 'success') {
    const filteredStudyLogs =
      normalizedQuery.length === 0
        ? props.summary.studyLogs
        : props.summary.studyLogs.filter((studyLog) =>
            studyLog.topic.toLocaleLowerCase().includes(normalizedQuery),
          )
    visibleStudyLogs = sortStudyLogs(filteredStudyLogs, sortOrder)
  }

  const selectedStudyLog =
    props.status === 'success'
      ? props.summary.studyLogs.find(
          (studyLog) => studyLog.id === interaction.selectedStudyLogId,
        )
      : undefined

  function startEditing() {
    if (selectedStudyLog === undefined) {
      return
    }

    beginEditing(selectedStudyLog.id, {
      topic: selectedStudyLog.topic,
      durationMinutes: selectedStudyLog.durationInputValue,
    })
  }

  function updateFormValue(field: keyof StudyLogFormValues, value: string) {
    changeFormValue(field, value)
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveEdit()
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

        {(props.status === 'empty' || props.status === 'success') &&
          interaction.editor.status === 'closed' && (
            <button
              type="button"
              disabled={isMutationPending}
              onClick={startCreating}
            >
              新しい学習ログを追加
            </button>
          )}

        {interaction.editor.status !== 'closed' &&
          interaction.editor.target.mode === 'create' && (
            <section
              className="study-log-detail"
              aria-labelledby="create-title"
            >
              <h2 id="create-title">新しい学習ログ</h2>
              <StudyLogEditorForm
                editor={interaction.editor}
                onChange={updateFormValue}
                onSubmit={(event) => {
                  void submitEdit(event)
                }}
                onCancel={cancelEditing}
              />
            </section>
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

            <label className="filter-field">
              <span>並び順</span>
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as StudyLogSortOrder)
                }
              >
                <option value="original">登録順</option>
                <option value="topic-asc">学習内容順</option>
                <option value="duration-desc">学習時間が長い順</option>
              </select>
            </label>

            {visibleStudyLogs.length === 0 ? (
              <p>条件に一致する学習ログがありません。</p>
            ) : (
              <ul className="study-log-list">
                {visibleStudyLogs.map((studyLog) => (
                  <li key={studyLog.id}>
                    <button
                      type="button"
                      className="study-log-item"
                      disabled={isMutationPending}
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
                    <>
                      <div className="form-actions">
                        <button
                          type="button"
                          disabled={isMutationPending}
                          onClick={startEditing}
                        >
                          編集する
                        </button>
                        <button
                          type="button"
                          disabled={interaction.deletion.status === 'deleting'}
                          onClick={() => {
                            void deleteSelectedStudyLog()
                          }}
                        >
                          {interaction.deletion.status === 'deleting'
                            ? '削除中...'
                            : '削除する'}
                        </button>
                      </div>
                      {interaction.deletion.status === 'delete-error' && (
                        <p className="field-error" role="alert">
                          {interaction.deletion.message}
                        </p>
                      )}
                    </>
                  ) : interaction.editor.target.mode === 'update' ? (
                    <StudyLogEditorForm
                      editor={interaction.editor}
                      onChange={updateFormValue}
                      onSubmit={(event) => {
                        void submitEdit(event)
                      }}
                      onCancel={cancelEditing}
                    />
                  ) : null}
                </>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
