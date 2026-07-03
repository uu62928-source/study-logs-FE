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

## 疑問・確認したいこと
