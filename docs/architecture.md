# ADR-001: feature-based architectureを採用する

- 状態: 採用
- 日付: 2026-07-01

## 文脈

このアプリは1週間で、学習ログの一覧、登録、編集、永続化、検索条件、テストへ育てる。ファイル種別だけで全機能を横断する構成は、機能変更時に複数ディレクトリを往復しやすい。

## 決定

トップレベルの依存方向を`app → features → shared`とする。学習ログに固有のコードは`features/study-log`へ置き、複数機能で再利用された業務知識を持たないコードだけを`shared`へ移す。

featureの公開入口は直下の`index.ts`とする。feature間の直接依存は禁止し、`app`が組み合わせる。

`study-log`内部では、実際に存在するユースケースと外部境界に対して最小限のClean Architectureを適用する。詳細は[Clean Architecture解説](./clean-architecture.md)に記録する。

## 見送った案

- 種類別の`components`、`hooks`、`types`をトップレベルに並べる案: 小さいうちは単純だが、機能の所有者と変更範囲が見えにくくなる
- アプリ全体へ一律にClean Architectureの全レイヤーを作る案: featureごとに必要な境界だけを作り、空の抽象化を避ける

## 影響

- 機能に関係するコードを近くに保てる
- `shared`へ移す判断が必要になる
- `study-log`ではUIとデータ保存方法を、Applicationが定義するRepository interfaceによって分離できる
- 小さな機能としてはファイル数が増えるため、新しい層は具体的な変更理由がある場合だけ追加する
- ESLintによる依存方向の自動検査は、構成が育って違反リスクが現れてから検討する
