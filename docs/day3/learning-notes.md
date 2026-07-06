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

### custom hookへ保存処理を切り出す

保存処理をcustom hookへ移すと、UIは保存方法を知らず、「ユーザーが保存を要求した」という意図だけをhookへ伝えられる。

入力値はcustom hookが管理する`interaction.editor.values`にあるため、送信時にUIから改めて保存データを渡す必要はない。

```tsx
<form
  onSubmit={(event) => {
    event.preventDefault()
    void submitEdit()
  }}
>
```

custom hookは、現在の入力値の検証と変換、状態遷移、保存処理、保存結果の反映を担当する。

```ts
async function submitEdit() {
  // 1. 現在の入力値を検証・変換
  const result = toStudyLog(editor.studyLogId, editor.values)

  // 2. 保存中へ遷移
  dispatch({ type: 'saveStarted' })

  // 3. 保存の副作用
  await onSaveStudyLog(result.studyLog)

  // 4. 結果を状態へ反映
  dispatch({ type: 'saveSucceeded' })
}
```

責務は次のように分ける。

```text
UI：何が操作されたかを通知し、stateに応じて表示する
custom hook：操作をどう処理するか決め、副作用を実行する
reducer：現在のstateとeventから次のstateを計算する
Repository：実際にデータを保存する
```

UIには、stateに応じた表示、ユーザー入力の通知、ボタンやフォーム操作の通知だけを残す。

`useStudyLogInteraction`を実装し、`StudyLogView`から`useReducer`、`dispatch`、入力値の検証、保存成功・失敗の処理を移した。

hookから`dispatch`を直接公開せず、ユーザーの意図を表す操作を公開した。

```ts
const {
  interaction,
  selectStudyLog,
  startEditing,
  changeFormValue,
  submitEdit,
  cancelEditing,
} = useStudyLogInteraction(saveStudyLog)
```

これにより、UIはeventの種類や送信順序を知らなくてよくなった。hookはRepositoryを直接importせず、保存関数を引数として受け取るため、保存先の実装と疎結合に保てる。

hookのテストでは、保存成功、入力値の検証失敗、保存失敗時の入力値保持を確認した。

### 追加と更新を型とuse caseで分ける

追加と更新は同じフォームを利用できるが、操作の意味とRepositoryに求める条件が異なる。

```text
add
├─ 同じIDがない → 追加成功
└─ 同じIDがある → 失敗

save
├─ 同じIDがある → 更新成功
└─ 同じIDがない → 失敗
```

更新なのに新規追加したり、追加なのに既存データを上書きしたりしないよう、Repositoryの`add`と`save`、Application層の追加use caseと更新use caseを分けた。

フォームの目的はoptionalなIDではなく、discriminated unionで表した。

```ts
type EditorTarget =
  | Readonly<{
      mode: 'create'
      newStudyLogId: string
    }>
  | Readonly<{
      mode: 'update'
      studyLogId: string
    }>
```

これにより、追加と更新の区別が`mode`で明確になり、それぞれに必要なIDを型で必須にできる。`editing`、`saving`、`save-error`の各状態で`target`を保持するため、保存中や再試行時にも追加と更新のどちらを実行するか判断できる。

新規IDの生成には`crypto.randomUUID()`を使う。毎回結果が変わる処理をreducerへ置くと純粋関数ではなくなるため、custom hookの`startCreating`で一度だけ生成し、eventとしてreducerへ渡す。

```ts
function startCreating() {
  dispatch({
    type: 'creationStarted',
    newStudyLogId: createId(),
  })
}
```

ID生成関数はcustom hookへ注入できるようにし、テストでは固定IDを返す。保存に失敗して再試行する場合も、最初に生成した同じIDを利用する。

空の一覧から追加フォームを開き、入力値を検証して追加し、再読み込み後の一覧へ表示できることを画面テストで確認した。

### 削除処理の状態を編集状態から分ける

削除はRepositoryへアクセスする副作用なので、reducer内では実行しない。custom hookが削除use caseを呼び、reducerは削除開始、成功、失敗の状態遷移だけを扱う。

```text
削除ボタン
  ↓
deletionStarted
  ↓
custom hookがdeleteStudyLog(id)を実行
  ├─ 成功 → deletionSucceeded
  └─ 失敗 → deletionFailed
```

削除状態はフォームを表す`editor`とは責務が異なるため、独立したdiscriminated unionにした。

```ts
type DeletionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{
      status: 'deleting'
      studyLogId: string
    }>
  | Readonly<{
      status: 'delete-error'
      studyLogId: string
      message: string
    }>
```

削除成功時は対象が存在しなくなるため、選択を解除して`idle`へ戻す。削除失敗時は対象がまだ存在するため、`selectedStudyLogId`と削除対象IDを残し、詳細画面でエラーを表示して再試行できるようにする。

編集中や保存中は削除操作を表示せず、編集と削除が同時に進む競合を避ける。Repositoryの`remove`は存在しないIDをエラーにし、削除用use caseでは画面由来の文字列IDをDomainの`StudyLogId`へ変換してから渡す。

Repository、use case、reducer、custom hook、画面の各層で削除成功と削除失敗をテストした。

### 並び替え結果はderived stateとして扱う

並び替え後の一覧は、元の学習ログ一覧と選択中の並び順から計算できる。そのため、並び替え結果をstateへ保存せず、`sortOrder`だけをstateとして保持する。

```ts
type StudyLogSortOrder =
  | 'original'
  | 'topic-asc'
  | 'duration-desc'
```

`sortOrder`は単独で変化する単純な値なので、編集や削除のreducerへ追加せず`useState`で管理した。将来、検索条件とともにURL stateへ移す予定である。

配列の`.sort()`は呼び出した配列自体を書き換える。propsの配列を直接並び替えると元の登録順を失い、同じ配列を参照する別の処理にも影響するため、コピーしてから並び替える。

```ts
const sortedStudyLogs = [...studyLogs].sort(compareFunction)
```

並び替え処理は`sortStudyLogs`という純粋関数へ分離し、次を実装した。

- 登録順
- 学習内容の昇順
- 学習時間の降順

フィルタ後の一覧を並び替えることで、検索条件と並び順を組み合わせた表示用一覧をderived stateとして計算する。テストでは並び順に加え、元の配列が変更されていないことも確認した。

### localStorageをRepositoryへ閉じ込める

localStorageは外部システムなので、UI、custom hook、reducerから直接操作せず、Infrastructure層の`LocalStorageStudyLogRepository`へ閉じ込めた。

```text
UI / custom hook / use case
            ↓
   StudyLogRepository
      ├─ InMemoryStudyLogRepository
      └─ LocalStorageStudyLogRepository
```

両方が同じRepository契約を実装するため、UIやuse caseを変更せず、アプリの構成部分で保存先を交換できる。

localStorageの実体をRepository内へ固定せず、`getItem`と`setItem`を持つオブジェクトをコンストラクタから受け取る。テストではインメモリのStorageを渡すことで、本物のlocalStorageを汚さずに初回起動、保存、復元、破損を再現できる。

### 外部データを`unknown`から検証する

`JSON.parse()`で得た値へ`as StudyLog[]`と書いても、型アサーションは実行時の値を検証しない。外部データは概念的に`unknown`として扱い、オブジェクト、配列、各フィールドの型を確認してからDomain型へ変換する。

```text
localStorage.getItem()
  ↓
JSON.parse()
  ↓
unknownとしてDTOの構造を検証
  ↓
createStudyLog()でDomainルールを検証
  ↓
StudyLogとして返す
```

保存形式には`version: 1`を持つDTOを使用した。未対応バージョン、壊れたJSON、不正なフィールド、Domainルールに違反する値は読み込み全体を失敗させる。壊れた1件だけを黙って捨てると、ユーザーにはデータが消えたように見えるためである。

保存データが存在しない`null`は初回起動として初期データを返す。一方、空配列が保存されている場合は、ユーザーがすべて削除した結果として空のまま復元する。

Repository契約は将来のAPI実装と同じく非同期の`Promise`を返す。localStorageの同期例外は`attempt`でrejectされたPromiseへ変換し、既存のエラー処理へ流す。

### 非同期処理中の競合と不変条件を防ぐ

保存中や削除中に別のログを選択すると、開始した操作と現在の選択がずれ、完了後の成功・失敗eventが別の画面状態へ届く可能性がある。

そのため、保存中または削除中は一覧選択、新規追加、編集開始をUIで無効にした。さらに、UI以外からeventが届いても状態を壊さないよう、reducerでも同じ遷移を拒否する。

```text
UIのdisabled → 通常操作で競合を起こさない
reducerのguard → 不正なeventでも状態を壊さない
```

`editStarted`では`selectedStudyLogId`も編集対象IDへ揃える。削除開始時は、eventの削除対象IDと現在の選択IDが一致する場合だけ受け付ける。これにより、「選択なしで既存ログを編集中」「選択中ではないログを削除中」といった矛盾した状態を防ぐ。

### 検索条件と並び順をURL stateにする

検索条件と並び順は、再読み込み後も復元したい、共有したい、ブックマークしたい値なのでURL search paramsへ移した。

```text
?q=TypeScript&sort=duration-desc
```

URLを唯一の情報源とし、`filterQuery`と`sortOrder`を同じ意味の`useState`へコピーしない。URLとローカルstateの両方に持つと、どちらが正しいか決める必要があり、同期漏れや更新ループの原因になる。

```text
URL search params
    ↓
useStudyLogSearchParams
    ↓
filterQuery / sortOrder
    ↓
表示一覧を計算
```

URLはReactの外部にある状態なので、`useSyncExternalStore`で`window.location.search`を購読する。`history.replaceState()`はReactへ変更を通知しないため、書き換え後に専用eventを発行する。ブラウザ履歴による`popstate`も同じ購読処理で反映する。

検索条件が空、または並び順が登録順の場合は既定値としてパラメータを削除する。不正な`sort`値は`original`として扱う。

テストではURLからの初期値、検索・並び順の書き換え、既定値の削除、不正値、ブラウザ履歴による変更を確認した。

### 学習日をForm、Domain、DTO、ViewModelで分ける

フォーム入力中の日付は空文字や不完全な値を含むため、検証前は`string`として扱う。保存時に形式と実在する日付かを検証し、成功した値だけをbranded typeの`StudyDate`へ変換する。

```text
Form: studiedOn: string
  ↓ 必須、YYYY-MM-DD、実在日付を検証
Domain: studiedOn: StudyDate
  ↓ 保存形式へ変換
DTO: studiedOn: string | null
  ↓ 表示用へ変換
ViewModel: studiedOnLabel / studiedOnInputValue
```

正規表現だけでは`2026-02-31`も通るため、年月日からUTCの日付を作り、元の年月日と一致するか確認する。新規作成時の初期値はcustom hookでローカル時間から作り、UTC基準の`toISOString()`による日付ずれを避ける。今日の日付を返す関数はテスト時に固定値を注入できる。

既存のlocalStorage version 1には日付がない。事実と異なる日付を自動で付けず、version 2へ読み込む際に`studiedOn: null`として移行し、画面では「日付未設定」と表示する。新規作成と編集フォームでは日付を必須にする。

Domainの日付検証、フォームの必須・実在日付検証、ViewModelの表示、custom hookの今日の日付、localStorage version 1の移行をテストした。

### 楽観的更新を今回は採用しない

楽観的更新では保存完了前に画面を更新し、失敗時に元の状態へ戻す。削除を元へ戻す場合は、削除したログ本体だけでなく、元の位置、選択状態、操作を識別するIDも保持する必要がある。

```text
削除前の状態を保持
  ↓
画面から先に削除
  ↓
Repositoryへ保存
  ├─ 成功 → 確定
  └─ 失敗 → 元の位置と選択状態へ戻す
```

`operationId`を持たせることで、古いリクエストの失敗が後から返ってきても、現在の操作と一致しない結果によるロールバックを防げる。

現在の保存先は同期的で高速なlocalStorageであり、画面を先に更新する利点より、退避状態、ロールバック、競合管理の複雑さが大きい。そのため、今回は保存完了後に再読み込みする悲観的更新を採用した。API通信を導入して待ち時間が目立つ場合に再検討する。

### Contextを今回は採用しない

現在の依存関係は`App → StudyLogPage → StudyLogView`と短く、必要な値と操作をpropsで明示できている。Contextを導入すると依存が見えにくくなるため、現時点では採用しない。複数の離れた画面が同じ値や操作を必要とする段階で再検討する。

## 理解度確認

### 第1問：derived stateを保存しない理由

計算で求められる値はstateへ保存せず、元の値から計算する。これにより、保持するstateを最低限にして設計を単純にできる。

`visibleStudyLogs`をstateへ保存すると、元の一覧、検索条件、並び順が変化するたびに同期が必要になる。更新を1つでも忘れると、古い一覧が画面へ残る。元情報から毎回計算すれば、同期処理と同期漏れを避けられる。

```text
元の一覧 + 検索条件 + 並び順
              ↓
       visibleStudyLogs
```

### 第2問：検索条件をURLだけで管理する理由

URLと`useState`の両方へ同じ検索条件や並び順を持つと、片方を変更するたびにもう片方との同期が必要になる。同期漏れが起きると、URLと画面表示が食い違い、どちらが正しい値なのか分からなくなる。

URLを唯一の情報源にすると二重管理を避けられる。さらに、再読み込み後の復元、URLの共有、ブックマーク、ブラウザ履歴による条件の復元が可能になる。

```text
URL
 ↓
filterQuery / sortOrder
 ↓
画面表示
```

### 第3問：`useState`と`useReducer`の選択

単純で利用範囲がコンポーネント内に閉じ、ほかの値と連動しないstateには`useState`が向いている。ただし、現在の`filterQuery`は共有・復元したいURL stateであり、`useState`では管理していない。

編集機能では、選択ID、フォーム値、入力エラー、保存中、保存失敗などの関連する値が、編集開始、入力変更、保存開始、保存成功、保存失敗といったイベントによって一緒に変化する。

`useReducer`を使うと、現在のstateとeventから次のstateを決める規則を一か所へ集約できる。不正な遷移をguardで拒否でき、Reactコンポーネントを介さず純粋関数として状態遷移をテストできる。

```text
単純で独立したローカルstate → useState
関連する複数の値と明確な状態遷移 → useReducer
共有・復元したい検索条件 → URL state
```

### 第4問：reducerを純粋関数に保つ

reducerは状態遷移だけを扱い、同じstateとeventを渡すと常に同じ次のstateを返す純粋関数にする。外部システムを変更せず、引数として受け取ったstateも直接書き換えない。

```text
同じstate + 同じevent → 常に同じ次のstate
```

Repositoryへの保存やlocalStorage操作は、外部状態を変更し、失敗する可能性がある副作用である。`crypto.randomUUID()`は呼ぶたびに異なる値を返すため、同じ入力から同じ結果を返せなくなる。これらをreducerへ置くと、再実行時の二重保存や異なるID生成、状態遷移テストの不安定化につながる。

副作用と非決定的な処理をcustom hookやInfrastructure層へ分けることで、reducerを入力と出力だけで単体テストでき、保存先やID生成方法が変わったときの修正範囲も明確になる。

### 第5問：保存処理の責務分担

保存に関する責務は次のように分ける。

| 責務 | 担当 |
| --- | --- |
| 保存ボタンの操作通知 | View |
| 入力値の検証と保存処理の進行 | custom hook |
| `saving`、`save-error`などの状態遷移 | reducer |
| localStorageへの実際の保存 | Repository |

Viewはユーザーの操作を受け取り、`submitEdit`のような意図を表す操作を通知する。custom hookは入力値を検証し、検証成功後に保存開始をdispatchしてRepositoryにつながる保存関数を呼び、その成功・失敗を再びdispatchする。つまり、custom hookは保存先の詳細ではなく、一連の処理手順を調整する。

reducerはeventに応じた状態遷移だけを担当するため、副作用を含まない純粋関数としてテストできる。RepositoryはlocalStorageへの読み書きを閉じ込めるため、Viewやhookを変更せずに保存先を別の実装へ交換できる。

### 第6問：保存関数を外から受け取る理由

custom hookがRepositoryを直接importせず、`onSaveStudyLog`のような保存関数を外から受け取ると、hookは具体的な保存方法を知らずに済む。RepositoryをlocalStorage版からAPI版などへ変更しても、同じ関数契約を保てばhookへ変更が波及しない。

また、テストでは本物のRepositoryを用意せず、成功や失敗を意図的に返す保存関数へ差し替えられる。これにより、保存成功、保存失敗、再試行などのhookの処理手順を、保存先から独立してテストできる。

### 第7問：作成と更新をdiscriminated unionで分ける理由

同じ状態をoptionalなIDの有無だけで作成と更新に使い分けると、コードを読む側がIDの意味を推測する必要があり、混乱しやすい。さらに、型の上では「作成なのに更新対象IDがある」「更新なのに更新対象IDがない」といった不正な組み合わせを表現できてしまう。

`mode: 'create' | 'update'`を判別子とするdiscriminated unionにすると、作成には`newStudyLogId`、更新には`studyLogId`が必須であることを型で表せる。`mode`で分岐した後はTypeScriptが型を絞り込むため、それぞれの処理で利用できる値も明確になる。

作成用と更新用の変更を分けやすくなる場合はあるが、常に影響範囲が小さくなるとは限らない。主な目的は、操作の意味を明示し、不正な状態を型で作れなくすることである。

### 第8問：新規作成開始時にIDを一度だけ生成する理由

`startCreating`で新規IDを一度だけ生成してeditorの`target`へ保持すると、保存失敗後の再試行でも同じIDを利用できる。同じ入力フォームを同じ新規学習ログとして扱い続けられ、保存を試すたびに別IDのデータになることを防げる。

ID生成は呼ぶたびに結果が変わるためreducerの外で行う。生成関数をcustom hookへ注入できるようにすると、テストでは固定IDを返して状態と保存内容を安定して検証できる。

### 第9問：Repositoryの`add`と`save`を分ける理由

新規追加と既存更新では、操作の意図と成功条件が異なる。

- `add`するIDがすでに存在する場合は失敗にする
- `save`するIDが存在しない場合も失敗にする

ここで防ぐのは型上の値の組み合わせではなく、要求された操作と保存済みデータの状態が食い違うことである。1つのupsert処理にすると、`add`が既存データを意図せず上書きしたり、`save`が存在しないデータを意図せず新規作成したりして、呼び出し側の誤りを隠す可能性がある。

操作を分けて事前条件に違反したら失敗させることで、追加と更新の意図をRepositoryの契約として表し、バグを早く検出できる。

### 第10問：編集状態と削除状態を分ける理由

編集と削除では、状態のライフサイクル、保持する情報、許可する操作が異なる。編集状態はフォーム値、入力エラー、保存状態などを扱い、削除状態は削除対象、削除中、削除失敗などを扱う。詳細画面の表示制御にも関係するが、分ける主な理由は、それぞれの責務と状態遷移を明確にし、無関係な状態の組み合わせを増やさないためである。

削除に失敗した場合、対象データはRepositoryに残っている。そのため、選択中の学習ログと詳細画面を維持し、削除エラーを表示する。画面を閉じてデータが消えたように見せず、内容の確認や再試行ができる状態を保つ。

### 第11問：並び替え結果をstateへ保存しない理由

並び替え後の一覧は、元の一覧と`sortOrder`から計算できるderived stateである。別のstateとして保存すると、元の一覧や並び順が変わるたびに同期が必要になり、更新漏れによって古い表示が残る可能性がある。

JavaScriptの`sort()`は元の配列自体を破壊的に変更する。propsやstate由来の配列へ直接`sort()`を使うと、所有していないデータを変更し、元の登録順も失われる。配列をコピーしてから並べ替えることで、元データの不変性と登録順を維持し、別の並び順も元データから正しく計算できる。

### 第12問：外部データにruntime validationが必要な理由

型アサーションはTypeScriptの型チェックへ「この型として扱う」と伝えるだけで、実行時の値を検証しない。したがって、`JSON.parse()`の結果に`as StudyLog[]`と書いても、欠けたフィールドや誤った型、Domainの制約に違反する値はそのまま通ってしまう。

localStorageなどから取得した外部データは、まず`unknown`として扱う。配列やオブジェクトであること、DTOの各フィールドの型、versionなどを実行時に検証し、その後Domainの生成処理を通して不変条件を検証する。

DTOの検証は保存形式として正しいかを確認し、Domainの検証はアプリ内で有効な値かを確認する。両者を通過した値だけをDomain型として扱う。

### 第13問：DTOのversionと旧データの移行

DTOの`version`は排他制御用ではなく、保存形式の世代を識別するschema versionである。読み込み時にversionを確認することで、現在の形式はそのまま変換し、旧形式は対応するmigrationへ渡し、未対応の形式はエラーにする、といった処理を明示できる。

複数タブによる同時更新の検出や排他制御を行うには、revision、更新時刻、ロックなど、schema versionとは別の仕組みが必要になる。

学習日を持たない旧データには、推測した日付を補わず`null`を設定する。これにより「元データでは日付が未設定だった」という事実を保ち、架空の日付を正しい情報のように表示したり、並び替えや集計へ利用したりすることを防げる。

### 第14問：UIとreducerの両方で不正操作を防ぐ理由

ボタンの`disabled`は現在のUIからの操作を防ぐが、連打、別の操作経路、将来追加されるUI、コードからのdispatchなど、Reducerへ不正なeventが届く可能性まではなくせない。

そのためReducer自身もguardを持ち、現在のstateで許可されないeventを拒否する。たとえば保存中に`cancelRequested`が届いた場合は、現在のstateをそのまま返して状態遷移させない。ここでの「拒否」は必ずしも例外を投げることではなく、不変条件を守ったまま不正な遷移を無視することである。

UIの制御はユーザーに実行可能な操作を示し、Reducerのguardはeventの流入経路にかかわらず矛盾したstateを作らないことを保証する。両方を組み合わせることで、使いやすさと状態の安全性をそれぞれ守る。

### 第15問：URL変更をReactへ通知する仕組み

URLはReactの外部状態なので、URLが変わったことを通知するeventを購読し、その通知を再レンダーへ接続する必要がある。今回は`useSyncExternalStore`で`window.location.search`をsnapshotとして読み、購読処理では次のeventを扱う。

- ブラウザの戻る・進むによる変更は`popstate`で受け取る
- アプリ内の`history.replaceState()`による変更は専用の`study-log-search-params-changed` eventで受け取る

`history.replaceState()`は`popstate`を自動では発火しない。そのため、URLを書き換えた直後に専用eventをdispatchし、購読者へ変更を通知する。通知を受けた`useSyncExternalStore`がsnapshotを再取得することで、URLを起点に検索条件と並び順が再計算される。

### 第16問：日付を形式だけでなく実在性まで検証する理由

正規表現で確認できるのは`YYYY-MM-DD`という文字の並びであり、月ごとの日数やうるう年までは判断できない。そのため、`2026-02-31`のように形式は正しいが実在しない日付も通過してしまう。

形式を確認した後、年月日からUTCの日付を生成し、生成後の年、月、日が入力値と一致するかを確認する。JavaScriptのDateが不正な日付を翌月へ繰り上げた場合は値が一致しないため、実在しない日付として拒否できる。これにより、うるう年を含むカレンダー上の妥当性を検証できる。

### 第17問：Formの文字列とDomainの日付を分ける理由

フォーム入力中には、空文字や`2026-0`のような未完成の値が自然に現れる。これらは日付として不正でも、編集途中のForm stateとしては正常である。そのため、入力中の値は検証前の`string`として保持する。

保存時に形式と実在性を検証し、成功した値だけを`StudyDate`へ変換する。これにより、Formは入力途中の状態を表現でき、Domainでは「`StudyDate`なら必ず有効な学習日である」という保証を維持できる。検証前と検証後を型で分けることで、未検証の文字列を誤って保存やDomainロジックへ渡すことも防げる。

### 第18問：初期日付をローカル時間から作る理由

`new Date().toISOString()`は日時をUTCへ変換する。日本などUTCより進んだタイムゾーンでは、ローカル時間の深夜から朝がUTCでは前日になるため、`slice(0, 10)`で取得した日付がユーザーにとっての今日より1日ずれる可能性がある。

学習日の初期値として必要なのはUTCの日付ではなく、ユーザーのローカル日付である。そのため、`getFullYear()`、`getMonth()`、`getDate()`でローカル時間の年月日を取得し、`YYYY-MM-DD`を組み立てる。

### 第19問：今日の日付を返す関数を注入する理由

今日の日付はテストを実行する日や時刻によって変わる。custom hook内で現在日時を直接取得すると期待値も日ごとに変化し、日付変更の瞬間や実行環境のタイムゾーンによってテストが不安定になる可能性がある。

日付を返す関数を外から注入できるようにすると、テストでは固定日付を返す関数へ差し替えられる。これにより、新規作成フォームの初期値を常に同じ条件で再現し、実行日時に依存しない決定的なテストにできる。

### 第20問：Storageを外から受け取る理由

`LocalStorageStudyLogRepository`が必要とするのは、`window.localStorage`そのものではなく、`getItem`と`setItem`ができる保存先である。この最小限の契約を外から注入すると、実運用では`window.localStorage`、テストではメモリ上の偽Storageを同じRepositoryへ渡せる。

テストで偽Storageを使うと、ブラウザの本物のデータを汚さず、初回起動、保存と復元、壊れたJSON、読み書き時の例外などを意図的に再現できる。Repositoryの変換やエラー処理を、ブラウザ環境から独立して検証できる。

これは保存処理の責務をRepositoryへ残したまま、Repositoryが依存する外部システムだけを交換可能にする依存性注入である。

たとえば偽Storageの`setItem`から例外を投げると、Repositoryの保存失敗を再現できる。同期的に発生したStorageの例外を、Repositoryがrejectされた`Promise`として呼び出し側へ伝播できることも確認できる。

### 第21問：同期StorageでもRepositoryがPromiseを返す理由

取得や保存を同期処理として公開する必要はないが、主な理由はRepositoryの利用側を具体的な保存先から切り離すことである。localStorage版も非同期の`Promise`契約に合わせておけば、将来API版へ交換してもcustom hookやuse caseの呼び出し方を変更せずに済む。

また、localStorageが同期的に投げる例外をrejected Promiseへ変換すると、呼び出し側は保存先に関係なく`await`と`try/catch`で成功・失敗を同じ形で扱える。

```text
localStorageの同期例外 ─┐
API通信の非同期エラー ──┴→ rejected Promise
                              ↓
                     同じエラー処理
```

### 第22問：現時点でContextを使わない理由

現在のコンポーネント階層は`App → StudyLogPage → StudyLogView`と短く、必要な値と操作をpropsで明示できている。Contextを導入すると値の取得元がpropsから見えなくなり、依存が暗黙的になるため、現状では増える複雑さに見合う利点がない。

階層の深さだけを理由に自動的にContextを選ぶわけではない。離れた複数のコンポーネントが同じ値や操作を必要とし、それらを使わない中間コンポーネントがpropsを中継し続ける状況になったら導入を再検討する。

```text
短い依存関係、利用箇所が明確 → props
離れた複数箇所で共有し、無関係な中間層が中継 → Contextを検討
```

### 第23問：localStorage版で楽観的更新を採用しない理由

localStorageは保存と再読み込みが速く、通信待ちのあるAPIと比べて楽観的更新による体感速度の改善が小さい。一方、画面だけを先に更新すると、保存失敗時のロールバックや、画面と永続化データという二つの状態を同期する処理が必要になる。

今回の条件では、楽観的更新の利点より、画面とlocalStorageの値が食い違うリスクや実装の複雑さのほうが大きい。保存成功後にRepositoryから再読み込みすれば、実際に永続化されたデータを正として画面を揃えられる。

将来API通信の待ち時間がユーザー体験へ影響する段階では、元データ、元の位置、選択状態、操作IDなどを保持するロールバック設計と合わせて楽観的更新を再検討する。

### 第24問：複数タブ更新とschema versionの違い

複数タブが同じlocalStorageデータを読み、それぞれの古い一覧を基に更新して全体を書き戻すと、後から保存したタブが先に保存された変更を上書きする可能性がある。両方の保存処理が成功して見えても、一方の更新が失われるlost updateである。

DTOのschema `version`が表すのは、どの保存形式で作られたデータかである。同じschema versionのデータが更新された回数や、自分が読み込んだ後に別のタブが更新したかは分からないため、排他制御には使えない。

競合を検出するには、データ更新ごとに変わるrevisionや更新時刻を持ち、読み込み時の値と保存時の値を比較するなど、schema versionとは別の仕組みが必要になる。別タブの変更通知も必要に応じて`storage` eventで画面へ反映する。

### 第25問：Form、Domain、DTO、ViewModelで日付を分ける理由

| 境界 | 表現 | 役割 |
| --- | --- | --- |
| Form | `string` | 空文字や未完成値を含む画面の入力値 |
| Domain | `StudyDate \| null` | 検証済みの`YYYY-MM-DD`文字列、または日付未設定 |
| DTO | `string \| null` | JSONへ保存できる外部データ表現 |
| ViewModel | `studiedOnLabel: string`など | 画面の用途に合わせて整形した表示値や入力用の値 |

`StudyDate`はJavaScriptの`Date`型ではなく、生成処理で形式と実在性を検証したbranded stringである。Domainでは有効な値であることを保証する。

JSONには日付型がないため、DTOでは`YYYY-MM-DD`の文字列または`null`として保存する。読み込み時にはDTOの構造を検証し、Domainの生成処理を通して`StudyDate`へ変換する。

ViewModelでは、同じDomain値から詳細表示用の`2026年7月3日`、フォーム入力用の`2026-07-03`、未設定時のラベルなど、UIの用途に合わせた文字列を作る。各境界を分けることで、入力途中、業務上有効な値、保存形式、表示形式という異なる制約を1つの型へ混在させずに済む。

### 第26問：入力エラーと保存エラーを分ける理由

入力値の検証エラーとRepositoryへの保存エラーでは、原因とユーザーが次に取れる操作が異なる。

- 入力エラー：フォーム値が不正なので保存処理へ進まず、該当する入力を修正してから再送信する
- 保存エラー：入力値は妥当だが外部への保存に失敗したので、入力内容を保持したまま再試行できる

同じエラー状態にまとめると、どの項目を直すべきか、修正せず再試行できるのかをUIが判断しにくくなる。状態を分けることで、入力項目ごとのメッセージと保存処理全体のメッセージを適切に表示し、それぞれに許可する操作も明確にできる。

### 第27問：保存先をAPIへ変更するときの修正範囲

主に変更するのはInfrastructure層である。既存の`StudyLogRepository`契約を実装するAPI版Repositoryを追加し、APIレスポンスのDTOをruntime validationしてDomainへ変換する。`configureStudyLog`などのcomposition rootでは、localStorage版の代わりにAPI版を組み立てて注入する。

Repository契約を保てれば、Domain、use case、reducer、custom hook、Viewは基本的に変更せず再利用できる。これらの層は具体的な保存方法ではなくRepositoryの抽象や注入された関数へ依存しているためである。

ただし、通信待ちがUXへ影響する場合のloading表示や楽観的更新、API固有のエラーをどう見せるかなど、要件自体が変わればUIやApplication層にも変更が必要になる。層分けは変更を完全になくすものではなく、保存方法だけの変更が波及しないようにする。

### 第28問：各テストが重点的に確認すること

| テスト対象 | 重点的に確認すること |
| --- | --- |
| reducer | stateとeventから正しい次のstateになること、不正な遷移を拒否して不変条件を守ること |
| custom hook | 入力検証、副作用の呼び出し、成功・失敗eventのdispatchという処理手順 |
| Repository | add、save、removeなどの契約、DTOとの変換、runtime validation、migration、Storageの読み書きと失敗時の伝播 |
| 画面全体 | ユーザー操作から表示更新まで、View、hook、use case、Repositoryなどが連携した一連の振る舞い |

custom hookのテスト対象はeventそのものだけではなく、どの条件でどの処理を呼び、その結果をどのeventとして状態へ反映するかというオーケストレーションである。画面全体のテストもViewの表示だけに限定せず、ユーザーから観測できる操作と結果を通して各層の接続を確認する。

## 疑問・確認したいこと
