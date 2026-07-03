# 3日目 振り返り

テーマ: 状態管理設計と状態遷移の明示化

関連資料: [ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [学習ノート](./learning-notes.md)

## 今日学んだこと

- stateには、ユーザーの入力や選択などの元情報を保存する
- ほかの値から完全に計算できる値はderived stateとして扱う
- 計算結果までstateにすると、元情報との同期処理が必要になる
- 状態管理では`useState`の個数よりも、同じ情報を複数箇所で管理していないかが重要
- `filteredStudyLogs`は`filterQuery`と学習ログ一覧から計算できる
- `selectedStudyLog`は`selectedStudyLogId`と学習ログ一覧から計算できる

## 実装したもの

まだコードの変更は行っていない。STEP1として、既存コードにあるstate、derived state、イベント、副作用を洗い出した。

## うまくいったこと

- 最初は`filteredStudyLogs`を`useState`だけで管理すれば重複しないと考えたが、元の一覧が別に存在するため同期が必要になると理解できた
- `selectedStudyLogId`と`props.summary.studyLogs`があれば、`selectedStudyLog`を計算できると自分で判断できた
- stateとして保持する元情報と、そこから計算する値を区別できた

## 次回の課題

- client state、server state、form state、URL stateの違いをさらに整理する
- 現在のイベントを列挙し、どの値が同時に変化するか確認する
- `editor`を`useState`で管理する場合と`useReducer`で管理する場合を比較する
