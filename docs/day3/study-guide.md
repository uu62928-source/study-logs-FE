# 3日目 学習ガイド

テーマ：状態管理設計と状態遷移の明示化

関連資料：[ドキュメント案内](./README.md) / [学習ノート](./learning-notes.md) / [振り返り](./retrospective.md) / [カリキュラム](../../react-typescript-ai-coding-curriculum.md)

## 今日のゴール

client state、server state、form state、URL stateを分類し、それぞれを適切な場所で管理できるようになる。

さらに、ユーザー操作をイベント、変更の規則を状態遷移、副作用を外部との同期として分け、状態が「どこで・なぜ変わったか」を追える設計にする。

## 達成目標

### 1. 状態を所有者と寿命で分類する

値を見つけたらすぐ`useState`へ入れるのではなく、誰がその値を所有し、いつまで保持する必要があるかを先に考える。

| 分類 | 例 | 主な置き場所 |
| --- | --- | --- |
| client state | 選択中の行、モーダルの開閉 | 使用するコンポーネントの近く |
| server state | RepositoryやAPIから取得した学習ログ | データ取得を担当するhookやライブラリ |
| form state | 入力途中の項目名、時間、エラー | フォームまたはフォーム用hook |
| URL state | 検索語、並び順、絞り込み条件 | URL search params |
| derived state | 合計時間、絞り込み後の一覧 | 元の値から計算し、原則として保存しない |

同じ意味の値を複数箇所で状態として持つと同期が必要になる。たとえば、学習ログ一覧と合計時間を別々のstateに保存せず、合計時間は一覧から計算する。

```ts
const totalMinutes = logs.reduce(
  (total, log) => total + log.durationMinutes,
  0,
)
```

状態を追加するときは次を確認する。

- propsや既存のstateから計算できないか
- URLやRepositoryなど、すでに信頼できる情報源がないか
- どのコンポーネントまで共有する必要があるか
- 再読み込み後も残す必要があるか

### 2. `useState`と`useReducer`を使い分ける

独立した単純な値には`useState`を使う。複数の値が同じイベントで変化する、遷移の規則が複雑、またはイベント単位でテストしたい場合は`useReducer`を検討する。

```ts
type StudyLogState = {
  logs: StudyLog[]
  editingId: StudyLogId | null
}

type StudyLogEvent =
  | { type: 'logAdded'; log: StudyLog }
  | { type: 'editStarted'; id: StudyLogId }
  | { type: 'editCancelled' }
  | { type: 'logUpdated'; log: StudyLog }
  | { type: 'logDeleted'; id: StudyLogId }

function studyLogReducer(
  state: StudyLogState,
  event: StudyLogEvent,
): StudyLogState {
  switch (event.type) {
    case 'logAdded':
      return { ...state, logs: [...state.logs, event.log] }
    case 'editStarted':
      return { ...state, editingId: event.id }
    case 'editCancelled':
      return { ...state, editingId: null }
    case 'logUpdated':
      return {
        logs: state.logs.map((log) =>
          log.id === event.log.id ? event.log : log,
        ),
        editingId: null,
      }
    case 'logDeleted':
      return {
        ...state,
        logs: state.logs.filter((log) => log.id !== event.id),
      }
  }
}
```

イベント名は`setEditingId`のような実装方法ではなく、`editStarted`のようにアプリで起きた事実を表す。reducerには現在の状態とイベントだけを渡し、同じ入力から常に同じ結果が返る純粋関数にする。

### 3. 状態遷移、ドメインロジック、副作用を分ける

3つの責務を同じ関数へ混ぜない。

- 状態遷移: reducerが現在の状態とイベントから次の状態を返す
- ドメインロジック: Domain層の純粋関数が値を検証・生成・更新する
- 副作用: custom hookやRepositoryが保存、URL更新、時刻取得などを行う

```text
ユーザー操作
    ↓
custom hook ──→ Domainの純粋関数
    ↓ 成功イベント
  reducer
    ↓ 新しい状態
localStorageやURLとの同期
```

たとえば、学習時間が正の整数かどうかはコンポーネントやreducerではなくDomain層で判断する。reducer内では`localStorage`、Repository、`Date.now()`などを直接呼ばない。

### 4. custom hookを状態管理の公開APIにする

コンポーネントが`dispatch`や保存手順をすべて知ると、UIと状態管理が密結合になる。custom hookから、画面に必要な状態とユーザーの意図を表す操作を返す。

```ts
type UseStudyLogsResult = {
  logs: StudyLogListItemViewModel[]
  totalDurationLabel: string
  addLog: (values: StudyLogFormValues) => Result<void, FormErrors>
  startEditing: (id: string) => void
  deleteLog: (id: string) => void
}
```

画面側は「どのeventをdispatchするか」「いつ保存するか」ではなく、`addLog`や`deleteLog`を呼ぶことだけを知る。hookが巨大になった場合は、状態遷移、永続化、URL同期の責務が混ざっていないか見直す。

### 5. localStorage同期を副作用として閉じ込める

localStorageは外部システムであり、読み書きの失敗や不正なデータを考慮する必要がある。

- 初期化時に一度だけ読み込む
- JSONの解析失敗を処理する
- 保存形式をDTOとしてDomain型から分ける
- 読み込んだ値を実行時に検証する
- 状態が変わった後に保存する

```ts
const [state, dispatch] = useReducer(
  studyLogReducer,
  initialState,
  loadInitialState,
)

useEffect(() => {
  saveStudyLogs(state.logs)
}, [state.logs])
```

`loadInitialState`と`saveStudyLogs`はstorage adapterへ分け、ReactやreducerからlocalStorageの詳細を隠す。保存失敗を無視するのか、画面へ通知するのかも決めておく。

### 6. 検索条件をURL stateとして扱う

検索語、フィルタ、並び順など、再読み込み後も復元したい・共有したい条件はURLへ置く。画面用stateとURLに同じ値を二重で持たず、URLを情報源にする。

```ts
const params = new URLSearchParams(location.search)
const query = params.get('q') ?? ''
const sort = params.get('sort') ?? 'newest'
```

URLへ書き込む前に値を正規化し、不正または未指定の値には既定値を使う。既定値までURLへ書くか、省略して短いURLにするかもルールを決める。

### 7. Contextを共有stateの置き場所にしすぎない

Contextは、離れた複数のコンポーネントが同じ値を必要とし、propsで渡すことが不自然な場合に使う。

候補になるもの：

- テーマやロケールなど、アプリの広い範囲で使う値
- 認証情報や機能単位の依存オブジェクト
- 機能配下の複数画面で共有する安定した操作

候補になりにくいもの：

- 1つのフォーム内だけで使う入力値
- 親子2〜3階層でしか使わない値
- 頻繁に変わり、広範囲の再レンダーを起こす巨大なstate
- URLやserver stateがすでに情報源になっている値

Contextを使う場合も、状態・操作・外部依存を無条件に1つへ詰め込まない。値の更新頻度と利用範囲が異なるなら分割を検討する。

### 8. 楽観的更新とロールバックを設計する

保存完了を待たずに画面を更新する楽観的更新では、成功時だけでなく失敗時と競合時の動作も必要になる。

```text
現在の状態を保持
    ↓
画面を先に更新
    ↓
Repositoryへ保存
  ├─ 成功 → 確定
  └─ 失敗 → 元の状態へ戻す + エラー表示
```

今回の保存先が同期的なlocalStorageだけなら、無理に楽観的更新を導入する必要はない。ただし4日目以降のAPI通信を見据え、次を説明できるようにする。

- どの状態まで戻すか
- 更新中に同じ項目が再操作された場合をどう扱うか
- 古いリクエストの完了で新しい状態を上書きしない方法
- 一時IDと保存後の正式IDをどう対応させるか

## 今日、説明・実演できれば合格

1. client state、server state、form state、URL stateの違い
2. 保存すべきstateと、計算で求めるderived stateの違い
3. `useState`と`useReducer`を選ぶ基準
4. UIの操作をイベントとして列挙し、状態遷移をreducerで表現する方法
5. reducerを純粋関数に保つ理由
6. DomainロジックとReactの状態管理を分ける理由
7. custom hookがUIへ公開する状態と操作
8. localStorageの読み込み、検証、保存、失敗時の扱い
9. 検索条件をURLに置く利点と、二重管理を避ける方法
10. Contextを採用する場合と見送る場合
11. 楽観的更新の失敗時にロールバックする方法
12. 追加、編集、削除、フィルタ、並び替え、再読み込み後の復元が動作すること

## 7.5時間の進め方

1. 45分: 現在の画面にある状態、計算値、イベント、副作用を洗い出して分類する
2. 90分: reducerのstateとevent、custom hookの公開API、永続化、URL同期を設計する
3. 180分: reducerまたはcustom hook、追加、編集、削除、フィルタ、並び替えを実装する
4. 60分: 状態遷移、localStorageへの保存、復元、編集、削除、異常データをテストする
5. 45分: Codexへ責務の混在、二重管理、Contextの必要性、競合リスクのレビューを依頼する
6. 30分: 採用した状態管理、見送った案、4日目へ持ち越す課題を記録する

## 実装前のチェックリスト

- [x] 画面で扱う状態をclient、server、form、URL、derivedに分類した
- [x] ユーザー操作と外部から起きるイベントを列挙した
- [x] `useState`または`useReducer`を選ぶ理由を説明できる
- [x] reducerのstateとeventを型で定義した
- [x] Domainロジック、状態遷移、副作用の置き場所を決めた
- [x] custom hookがUIへ公開する値と操作を決めた
- [x] localStorageの保存形式と異常データの扱いを決めた
- [x] URLを情報源にする検索条件を決めた
- [x] Contextが本当に必要か確認した
- [x] 保存失敗や競合が起きた場合の振る舞いを決めた

## 完了時のチェックリスト

- [x] 学習項目、学習時間、日付を追加できる
- [x] 合計学習時間が元の一覧から正しく計算される
- [x] 編集と削除が状態遷移として実装されている
- [x] フィルタと並び替えが動作する
- [x] 検索条件がURLへ反映され、再読み込み後も復元される
- [x] 学習ログがlocalStorageへ保存され、再読み込み後も復元される
- [x] localStorageの空データ、不正なJSON、不正な値を安全に扱える
- [x] reducerまたは状態遷移の純粋関数を単体テストした
- [x] 保存と復元をstorage adapterのテストで確認した
- [x] 不要なContextと重複stateがない
- [x] `npm run lint`、`npm run test`、`npm run build`が成功する
- [x] 状態管理の選択理由と残課題を振り返りへ記録した

## Codexへのレビュー依頼例

```text
この状態管理をレビューし、UI state / domain logic / side effects に分離してください。
client state、server state、form state、URL stateの分類と、
useReducer、custom hook、Context、URLSearchParamsの使い分けを
理由付きで提案してください。
```
