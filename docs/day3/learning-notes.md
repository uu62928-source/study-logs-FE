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

## 試したこと

現在の`StudyLogView`を読み、stateとして保存されている値と、元情報から計算されている値を分類した。

特に、`selectedStudyLogId`と`props.summary.studyLogs`から`selectedStudyLog`を計算できることを確認した。

## 疑問・確認したいこと


