export function StudyLogPage() {
  return (
    <main className="page">
      <p className="eyebrow">Day 1 · Architecture</p>
      <h1>学習ログ</h1>
      <p className="lead">
        学んだことと時間を記録し、継続を見える形にするためのアプリです。
        今日は機能よりも、変更に強い境界を設計します。
      </p>

      <section className="card" aria-labelledby="today-heading">
        <h2 id="today-heading">今日の到達点</h2>
        <p>
          React、TypeScript、Vite、ESLint、Prettier、Vitestの土台が整いました。
          次は型で仕様を表現します。
        </p>
      </section>
    </main>
  )
}
