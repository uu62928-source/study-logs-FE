# 3日目 学習ノート

テーマ: 状態管理設計と状態遷移の明示化

関連資料: [ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [振り返り](./retrospective.md)

---

## 学んだこと

### stateとderived stateの違い

ほかの値から完全に計算できる値は、`useState`へ保存せずderived state（派生値）として扱う。

stateへ保存するのは、ユーザーの入力や選択など、計算だけでは求められない元情報である。計算結果までstateにすると、元情報が変わるたびに両方を同期する処理が必要になる。同期を忘れると、画面へ古い値が表示される。

```text
元情報 → state
元情報から計算できる値 → derived state
```

重要なのは`useState`の個数ではなく、同じ情報を複数箇所で管理していないかという点である。

### `filteredStudyLogs`はderived state

`filteredStudyLogs`は、次の2つがあれば計算できる。

- `filterQuery`
- `props.summary.studyLogs`

```ts
const normalizedQuery = filterQuery.trim().toLocaleLowerCase()

const filteredStudyLogs = props.summary.studyLogs.filter((studyLog) =>
  studyLog.topic.toLocaleLowerCase().includes(normalizedQuery),
)
```

検索結果を`useState`へ保存すると、検索条件または元の一覧が変わるたびに更新しなければならない。毎回元情報から計算すれば、同期処理と古い検索結果が残る問題を避けられる。

### `selectedStudyLog`もderived state

`selectedStudyLog`は、次の2つがあれば計算できる。

- `selectedStudyLogId`
- `props.summary.studyLogs`

```ts
const selectedStudyLog = props.summary.studyLogs.find(
  (studyLog) => studyLog.id === selectedStudyLogId,
)
```

`selectedStudyLogId`はユーザーが選択した元情報なのでstateとして保持する。一方、選択されたログそのものは最新の一覧から計算する。

ログの内容が編集された場合も、毎回最新の一覧から検索するため、選択中のログに古い内容が残りにくい。

### 現在の状態の分類

| 対象 | 分類 | 理由 |
| --- | --- | --- |
| `filterQuery` | client state | ユーザーが入力した検索条件 |
| `selectedStudyLogId` | client state | ユーザーが選択したログのID |
| `editor` | form stateと保存状態 | 入力値、エラー、保存中などを表す |
| `state` | server stateを表示するためのUI state | 読み込み、成功、空、失敗を表す |
| `requestVersion` | 内部state | 再読み込みを発生させる |
| `normalizedQuery` | derived state | `filterQuery`から計算できる |
| `filteredStudyLogs` | derived state | 検索条件と一覧から計算できる |
| `selectedStudyLog` | derived state | 選択IDと一覧から計算できる |

### 現在の副作用

- `getStudyLogSummary()`による学習ログの読み込み
- `updateStudyLog()`による学習ログの保存

これらは外部のRepositoryへアクセスする処理であり、同じ入力から常に同じ結果を返す単純な計算とは異なる。

### reducerは状態遷移だけを扱う

reducerは、次の関係だけを扱う純粋関数にする。

```text
現在のstate + event → 次のstate
```

Repositoryへの保存、API通信、localStorage操作などの副作用はreducerで扱わない。副作用はreducerの外で実行し、その結果を成功または失敗のeventとしてreducerへ渡す。

```ts
dispatch({ type: 'saveStarted' })

try {
  await updateStudyLog(studyLog)
  dispatch({ type: 'saveSucceeded' })
} catch {
  dispatch({
    type: 'saveFailed',
    message: '学習ログを保存できませんでした。',
  })
}
```

`saveSucceeded`では、現在の仕様に合わせて`editor`を`closed`へ遷移させる。`saveFailed`では再編集や再送信ができるように、`studyLogId`と入力中の`values`を残したまま`save-error`へ遷移させる。

### `editing`と`save-error`を分ける理由

`editing`と`save-error`では、エラーの原因が異なる。

| 状態 | 意味 | エラーの種類 |
| --- | --- | --- |
| `editing` | 入力・修正中 | 未入力や不正な学習時間などの入力エラー |
| `saving` | 保存処理中 | なし |
| `save-error` | 入力値は正しいが保存に失敗した | Repositoryや通信などの保存エラー |

```text
editing
  ↓ バリデーション成功
saving
  ├─ 保存成功 → closed
  └─ 保存失敗 → save-error
```

`save-error`では、再編集や再保存ができるように`studyLogId`と入力中の`values`を残し、保存失敗の理由を示す`message`を持つ。

```ts
type SaveErrorEditorState = Readonly<{
  status: 'save-error'
  studyLogId: string
  values: StudyLogFormValues
  message: string
}>
```

`editing`に`saveError?: string`を追加して保存失敗も表すことはできる。しかし、通常の編集中、入力エラーがある編集中、保存失敗後の編集中の違いが曖昧になる。

`save-error`を独立した状態にすると、`status`だけで保存失敗を判定でき、不正または曖昧な状態を減らせる。保存失敗後に入力値を変更した場合は`editing`へ戻し、「保存失敗後」から「再び編集中」へ変化したことを明示する。

## 試したこと

現在の`StudyLogView`を読み、stateとして保存されている値と、元情報から計算されている値を分類した。

特に、`selectedStudyLogId`と`props.summary.studyLogs`から`selectedStudyLog`を計算できることを確認した。

編集開始、入力変更、バリデーション失敗、保存開始、保存成功、保存失敗をeventとして表し、それぞれの状態遷移を整理した。

設計した状態遷移を`studyLogInteractionReducer`として実装し、`StudyLogView`の`selectedStudyLogId`と`editor`を別々の`useState`で管理する方法から、1つの`useReducer`で管理する方法へ変更した。

```ts
const [interaction, dispatch] = useReducer(
  studyLogInteractionReducer,
  initialStudyLogInteractionState,
)
```

コンポーネント内の`interaction`が現在の状態であり、`dispatch`したeventとともにreducerへ渡される。reducerの引数`state`は現在の`interaction`を指し、reducerが返した次のstateが次回レンダー時の`interaction`になる。

```text
interaction + dispatchしたevent
              ↓
studyLogInteractionReducer(state, event)
              ↓
次のinteraction
```

保存失敗後に入力値を変更せず再試行できるよう、`saveStarted`は`editing`と`save-error`の両方から許可した。

reducerの単体テストを追加し、ログ選択、編集開始、入力変更、保存失敗、再保存、キャンセル、保存中の不正なキャンセルを確認した。

## 疑問・確認したいこと
