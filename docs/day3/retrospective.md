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
- reducerは「現在のstate + event → 次のstate」だけを扱う純粋関数にする
- Repositoryへの保存、API通信、localStorage操作などの副作用はreducerの外へ置く
- 副作用の結果は、成功または失敗のeventとしてreducerへ渡す
- `editing`は入力・修正中、`save-error`は入力値が正しいにもかかわらず保存に失敗した状態を表す
- `save-error`に入力値とIDを残すことで、ユーザーは内容を打ち直さずに再編集・再保存できる
- 保存エラーをoptionalな値で`editing`へ混ぜず、独立した状態にすると、`status`だけで状況を判定できる

## 実装したもの

まだコードの変更は行っていない。STEP1で既存コードにあるstate、derived state、イベント、副作用を洗い出し、STEP2で編集機能の状態遷移を設計した。

## うまくいったこと

- 最初は`filteredStudyLogs`を`useState`だけで管理すれば重複しないと考えたが、元の一覧が別に存在するため同期が必要になると理解できた
- `selectedStudyLogId`と`props.summary.studyLogs`があれば、`selectedStudyLog`を計算できると自分で判断できた
- stateとして保持する元情報と、そこから計算する値を区別できた
- 保存処理はreducerの外、保存結果による状態遷移はreducerの中、と責務を分けられた
- 保存成功時は`closed`、保存失敗時は入力内容を残した`save-error`が適切だと判断できた
- 入力エラーと保存エラーでは原因と次に可能な操作が異なるため、状態を分ける意味を理解できた

## 次回の課題

- client state、server state、form state、URL stateの違いをさらに整理する
- 現在のイベントを列挙し、どの値が同時に変化するか確認する
- `editor`を`useState`で管理する場合と`useReducer`で管理する場合を比較する
