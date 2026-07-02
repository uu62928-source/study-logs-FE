import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import { useStudyLogSummary } from './useStudyLogSummary'
import './StudyLogPage.css'

type StudyLogPageProps = Readonly<{
  getStudyLogSummary: GetStudyLogSummary
}>

export function StudyLogPage({ getStudyLogSummary }: StudyLogPageProps) {
  const state = useStudyLogSummary(getStudyLogSummary)

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
                  <span>{studyLog.durationMinutes}分</span>
                </li>
              ))}
            </ul>
            <p className="total">
              合計 <strong>{state.summary.totalMinutes}分</strong>
            </p>
          </>
        )}
      </section>
    </main>
  )
}
