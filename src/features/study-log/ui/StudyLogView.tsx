import type { StudyLogViewState } from './studyLogViewModel'

type StudyLogViewProps = Readonly<{
  state: StudyLogViewState
}>

export function StudyLogView({ state }: StudyLogViewProps) {
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
            <ul className="study-log-list">
              {state.summary.studyLogs.map((studyLog) => (
                <li key={studyLog.id}>
                  <span>{studyLog.topic}</span>
                  <span>{studyLog.durationLabel}</span>
                </li>
              ))}
            </ul>
            <p className="total">
              合計 <strong>{state.summary.totalDurationLabel}</strong>
            </p>
          </>
        )}
      </section>
    </main>
  )
}
