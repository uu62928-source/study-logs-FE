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

- `studyLogInteractionReducer`と初期状態、eventの型
- `StudyLogView`の`selectedStudyLogId`と`editor`を`useReducer`へ統合
- ログ選択、編集開始、入力変更、バリデーション失敗、保存開始、保存成功、保存失敗、編集キャンセルの状態遷移
- reducerの状態遷移テスト7件
- 保存失敗後に入力を変えず再保存できる遷移
- `useStudyLogInteraction`による状態管理、入力検証、保存処理の集約
- custom hookの保存成功、検証失敗、保存失敗のテスト3件
- `StudyLogView`から`dispatch`と保存手順を除去
- 追加と更新を区別する`EditorTarget`
- 新規IDを一度だけ生成する`startCreating`
- Repositoryの`add`と追加用use case
- 空状態と一覧表示中の両方から利用できる追加フォーム
- ID重複時の追加失敗と、存在しないIDの更新失敗
- 削除用use caseとRepositoryの`remove`
- `idle`、`deleting`、`delete-error`を表す`DeletionState`
- 削除成功時の選択解除と、削除失敗時の選択維持
- 詳細画面の削除中表示と削除エラー表示
- 登録順、学習内容順、学習時間順の並び替え
- 元配列を変更しない`sortStudyLogs`
- フィルタ結果と並び順から計算する表示用一覧
- バージョン付きDTOを使う`LocalStorageStudyLogRepository`
- localStorageへの追加、更新、削除、復元
- `unknown`からのDTO構造とDomainルールの実行時検証
- Storageを外から受け取ることで本物のlocalStorageを使わないテスト
- 破損JSON、不正データ、未対応バージョンのエラー処理
- 保存・削除中の一覧選択、新規追加、編集開始の無効化
- UIとreducerの両方で競合操作を防ぐguard
- 編集対象と選択ID、削除対象と選択IDの整合性チェック
- 検索条件`q`と並び順`sort`のURL search params同期
- URLを唯一の情報源にする`useStudyLogSearchParams`
- `useSyncExternalStore`によるURL変更と`popstate`の購読
- URLの既定値省略と不正な並び順のフォールバック

## うまくいったこと

- 最初は`filteredStudyLogs`を`useState`だけで管理すれば重複しないと考えたが、元の一覧が別に存在するため同期が必要になると理解できた
- `selectedStudyLogId`と`props.summary.studyLogs`があれば、`selectedStudyLog`を計算できると自分で判断できた
- stateとして保持する元情報と、そこから計算する値を区別できた
- 保存処理はreducerの外、保存結果による状態遷移はreducerの中、と責務を分けられた
- 保存成功時は`closed`、保存失敗時は入力内容を残した`save-error`が適切だと判断できた
- 入力エラーと保存エラーでは原因と次に可能な操作が異なるため、状態を分ける意味を理解できた
- `interaction`とreducer内の`state`が、Reactによってつながる同じ状態だと理解できた
- reducerをUIから分離したことで、Reactコンポーネントを介さず状態遷移をテストできた
- `npm run test`、`npm run lint`、`npm run build`がすべて成功した
- UIは操作を通知し、custom hookは処理手順、reducerは状態遷移、Repositoryは保存を担当する形に分けられた
- custom hookへ`dispatch`を公開せず、`submitEdit`などの意図を表す操作だけを公開できた
- 保存関数を外から受け取ることで、custom hookを特定のRepository実装から切り離せた
- custom hook追加後も全45件のテスト、lint、buildが成功した
- optionalなIDではなく`create`と`update`のunionを使い、不正な組み合わせを型で防げた
- ランダムなID生成をreducerの外へ置き、reducerを純粋関数に保てた
- 追加と更新を別のRepository操作にして、意図しない追加や上書きを防げた
- 追加機能の実装後も全51件のテスト、lint、buildが成功した
- 編集状態と削除状態を分け、それぞれの責務と許可する操作を明確にできた
- 削除失敗時は対象が残っているため、詳細画面と選択状態を維持する設計にできた
- 削除機能の実装後も全59件のテスト、lint、buildが成功した
- 並び替え結果をstateへ保存せず、元の一覧と`sortOrder`から計算できた
- propsの配列をコピーしてから並び替え、元の登録順を維持できた
- 並び替え実装後も全63件のテスト、lint、buildが成功した
- 型アサーションは実行時検証ではなく、外部データを信用する前に構造の確認が必要だと理解できた
- Repository契約を維持したまま、アプリの保存先をインメモリからlocalStorageへ交換できた
- Storageを外から渡すことで、mockでも同じRepository処理をテストできた
- localStorage実装後も全70件のテスト、lint、buildが成功した
- 非同期処理中はUIを無効にするだけでなく、reducerでも不正な遷移を拒否する必要があると理解できた
- reducer単体でも矛盾した状態を作れないよう、不変条件を状態遷移へ組み込めた
- 競合対策後も全73件のテスト、lint、buildが成功した
- URLを起点として画面stateを計算し、同じ検索条件をローカルstateへ二重管理せずに済んだ
- URLはReact外部の状態なので、変更通知を購読して再レンダーにつなげる必要があると理解できた
- URL同期後も全78件のテスト、lint、buildが成功した

## 次回の課題

- client state、server state、form state、URL stateの違いをさらに整理する
- 現在のイベントを列挙し、どの値が同時に変化するか確認する
- `editor`を`useState`で管理する場合と`useReducer`で管理する場合を比較する
