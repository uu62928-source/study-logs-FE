# 2日目 学習ノート

テーマ：型モデリングとコンポーネントAPI設計

関連資料：[ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [振り返り](./retrospective.md)

---

## Domain型をUIへ直接渡さない

### 何が分かりにくかったか

Domain型にも`topic`や`durationMinutes`が入っているため、なぜそのまま画面へ渡してはいけないのかが分かりにくかった。

### Domain型とViewModelの役割

Domain型は「業務上、その値が何であるか」を表す。

```ts
type StudyLog = {
  id: StudyLogId
  topic: string
  durationMinutes: StudyDurationMinutes
}
```

一方、ViewModelは「画面へどのように表示するか」を表す。

```ts
type StudyLogListItemViewModel = {
  id: string
  topic: string
  durationLabel: string
}
```

`durationMinutes: 90`は計算に向いたDomainの値であり、`durationLabel: '90分'`は表示に向いたUIの値である。

### 直接渡した場合の問題

Domain型を直接受け取ると、表示形式の決定がコンポーネントへ入り込む。

```tsx
// UIが数値の表示方法まで決めている
<span>{studyLog.durationMinutes}分</span>
```

「90分」を「1時間30分」へ変更するとき、同じ変換を行うすべてのコンポーネントを探して修正する必要がある。

現在は`toStudyLogSummaryViewModel()`へ変換を集めている。

```ts
durationLabel: `${studyLog.durationMinutes}分`
```

UIは完成した表示用文字列を受け取って表示するだけになる。

```tsx
<span>{studyLog.durationLabel}</span>
```

### 判断ルール

- 計算、比較、業務ルールに使う値はDomain型に置く
- 表示用に整形した文字列はViewModelに置く
- 表示形式の変更をUI全体へ散らしたくない場合は、ViewModelへの変換を用意する
- 小さな画面ですべての値をそのまま表示するだけなら、無理にViewModelを作る必要はない

---

## UI状態をdiscriminated unionで表す

### 何が分かりにくかったか

なぜ`isLoading`や`errorMessage?`などの個別のpropsではなく、`status`を持つunionにするのかが分かりにくかった。

### optional propsで表した場合

次の型では、各プロパティを自由に組み合わせられる。

```ts
type StudyLogViewProps = {
  isLoading: boolean
  summary?: StudyLogSummaryViewModel
  errorMessage?: string
}
```

そのため、次のような矛盾した状態も型エラーにならない。

```ts
{
  isLoading: true,
  summary: { /* 読み込み済みのデータ */ },
  errorMessage: '読み込みに失敗しました'
}
```

読み込み中、成功、失敗が同時に成立しており、UI側でどれを優先するか考えなければならない。

### discriminated unionで表した場合

現在は`status`を判別キーとして、取り得る状態を列挙している。

```ts
type StudyLogViewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; summary: StudyLogSummaryViewModel }
  | { status: 'error'; message: string }
```

この型では、一度に選べる状態は1つだけである。また、状態ごとに必要な値も決まる。

```text
loading → 追加データなし
empty   → 追加データなし
success → summaryが必要
error   → messageが必要
```

例えば`success`なのに`summary`がない値や、`loading`に`message`を付けた値は型エラーになる。

`StudyLogView`内では`status`を確認すると、TypeScriptがその状態の型へ絞り込む。

```tsx
{
  state.status === 'success' && (
    <strong>{state.summary.totalDurationLabel}</strong>
  )
}
```

この分岐の中では、`summary`が必ず存在することをTypeScriptが理解している。

### 判断ルール

- 複数の状態が同時に成立してはいけない場合はdiscriminated unionを検討する
- 判別キーには`status`、`type`、`variant`などを使う
- 各状態には、その状態でだけ必要な値を持たせる
- booleanやoptional propsを追加する前に、状態の種類として分けるべきか確認する

---

## ContainerとPresentationalを分ける

### 何が分かりにくかったか

`StudyLogPage`と`StudyLogView`は、どちらも画面に関係するコンポーネントであり、分けた後の役割の違いが分かりにくかった。

### 今回の役割分担

`StudyLogPage`はContainerである。データをどのように準備するかを担当する。

```tsx
export function StudyLogPage({ getStudyLogSummary }: StudyLogPageProps) {
  const state = useStudyLogSummary(getStudyLogSummary)

  return <StudyLogView state={state} />
}
```

`StudyLogView`はPresentational componentである。渡された状態をどのように表示するかを担当する。

```tsx
type StudyLogViewProps = {
  state: StudyLogViewState
}

export function StudyLogView({ state }: StudyLogViewProps) {
  // stateに応じてJSXを返す
}
```

役割を短く表すと次のようになる。

```text
StudyLogPage: 表示するデータを用意する
StudyLogView: 用意されたデータを表示する
```

データの流れは一方向である。

```text
getStudyLogSummary
        ↓
useStudyLogSummary
        ↓
StudyLogPage
        ↓ stateをpropsで渡す
StudyLogView
        ↓
画面
```

`StudyLogView`はRepository、ユースケース、データ取得のタイミングを知らない。必要なのは`StudyLogViewState`だけなので、任意の状態をpropsで渡して表示を確認しやすい。

### 常に分ける必要はない

小さく単純なコンポーネントまで機械的に分けると、ファイル間を移動する手間が増える。

今回のように、非同期取得、状態変換、複数の表示状態がある場合は、データ準備と表示を分ける価値がある。

### 判断ルール

- データ取得や状態管理とJSXが混ざって読みにくくなったら分離を検討する
- Containerは「何を表示するか」を準備する
- Presentational componentは「どう表示するか」を担当する
- 表示だけを独立してテスト・確認したい場合は分離が有効
- 分けても役割を一文で説明できないなら、分割が早すぎる可能性がある

---

## hookをApplicationとUIの変換境界にする

### 何が分かりにくかったか

`useStudyLogSummary`が単なるデータ取得用hookではなく、Applicationの結果をUI状態へ変換する境界でもある、という点が分かりにくかった。

### ApplicationとUIでは「成功」の意味が異なる

Applicationの`getStudyLogSummary()`にとって、0件取得は正常な成功である。

```ts
{
  studyLogs: [],
  totalMinutes: 0
}
```

しかしUIでは、1件以上ある一覧と0件の画面で、表示内容やユーザーへ促す操作が異なる。

```text
Application: 取得成功
                  ↓ UIの意味へ変換
UI:          empty または success
```

この変換を`useStudyLogSummary`が担当する。

```ts
summary.studyLogs.length === 0
  ? { status: 'empty' }
  : {
      status: 'success',
      summary: toStudyLogSummaryViewModel(summary),
    }
```

さらに、Applicationから受け取ったDomain寄りの値を、表示用のViewModelへ変換する。

```text
StudyLogSummary
      ↓ toStudyLogSummaryViewModel
StudyLogSummaryViewModel
```

取得失敗も、画面で表示するエラー状態へ変換する。

```ts
{
  status: 'error',
  message: '学習ログを読み込めませんでした。'
}
```

つまり、このhookには次の3つの役割がある。

1. 非同期処理の開始と完了をReactのstateで管理する
2. Applicationの結果を`empty`や`success`などのUI状態へ分類する
3. Domain寄りの値をViewModelへ変換する

### 全体のつながり

```text
Repository
   ↓ Domain型を返す
Application
   ↓ StudyLogSummaryを返す
useStudyLogSummary
   ↓ UI状態の判定とViewModel変換
StudyLogPage
   ↓ stateをpropsで渡す
StudyLogView
   ↓ 表示
ユーザー
```

### 判断ルール

- ApplicationはReactや画面表示を知らない
- APIやApplicationの結果を、そのままUI状態だと考えない
- UI固有の状態判定や表示用変換はUI層で行う
- hookの責務が増えすぎた場合は、判定関数や変換関数を純粋関数として外へ分ける

---

## 編集機能における責務分担

### 責務を分ける目的

編集機能では、フォーム入力、入力値の検証、保存、再取得、画面表示という複数の処理が必要になる。

これらを1つのコンポーネントへ集めると、入力ルールや保存方法を変更したときに、同じファイルの多くの箇所が影響を受ける。そこで、「何が変わったときに変更されるか」に基づいて責務を分ける。

### 各ファイルが担当すること

| ファイル                        | 担当すること                                         | 知らなくてよいこと                        |
| ------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `studyLogForm.ts`               | 入力途中の文字列を検証し、Domain型へ変換する         | React、保存方法、画面レイアウト           |
| `StudyLogView.tsx`              | フィルタ、選択、フォーム状態、画面表示を扱う         | Repositoryの実装、保存先                  |
| `StudyLogPage.tsx`              | UIと更新ユースケースを接続し、保存後に再読み込みする | 入力値の具体的な検証ルール、保存方法      |
| `updateStudyLog.ts`             | 検証済みの学習ログを保存する処理を表す               | React、フォーム、Repositoryの具体的な実装 |
| `StudyLogRepository.ts`         | 読み取りと書き込みに必要な契約を定義する             | メモリやAPIなどの具体的な保存方法         |
| `InMemoryStudyLogRepository.ts` | メモリ上で学習ログを取得・更新する                   | 画面表示、フォーム、React                 |
| `configureStudyLog.ts`          | Repositoryと各ユースケースを生成して組み合わせる     | UI上の操作や表示方法                      |

### 入力から再表示までの流れ

```text
ユーザーがフォームへ入力
        ↓
StudyLogView
Form型として入力途中の文字列を保持する
        ↓
studyLogForm
入力値を検証してDomain型へ変換する
        ↓
StudyLogPage
更新ユースケースを呼び出す
        ↓
updateStudyLog
Repositoryのsave契約を呼び出す
        ↓
InMemoryStudyLogRepository
メモリ上のデータを更新する
        ↓
StudyLogPage
保存成功後にreloadする
        ↓
getStudyLogSummary
更新後のデータを取得する
        ↓
ViewModelへ変換して画面を再表示する
```

重要なのは、画面が`InMemoryStudyLogRepository`を直接呼び出していない点である。UIは更新ユースケースだけを知り、更新ユースケースは`StudyLogWriter`という契約だけを知る。

```text
UI → UpdateStudyLog → StudyLogWriter ← InMemoryStudyLogRepository
```

将来、保存先をAPIへ変更しても、`StudyLogWriter`を実装する別のRepositoryへ差し替えればよい。フォームや画面は保存先の変更を知らなくてよい。

### 読み取りと書き込みの契約を分ける理由

Repositoryの契約は、利用側が必要とする操作ごとに分けている。

```ts
interface StudyLogReader {
  findAll(): Promise<readonly StudyLog[]>
}

interface StudyLogWriter {
  save(studyLog: StudyLog): Promise<void>
}
```

取得ユースケースは`findAll`だけを必要とするため、`StudyLogReader`へ依存する。更新ユースケースは`save`だけを必要とするため、`StudyLogWriter`へ依存する。

```text
GetStudyLogSummary → StudyLogReader
UpdateStudyLog     → StudyLogWriter
```

これにより、各ユースケースが使用しない操作まで知ることを避けられる。テストでも、対象のユースケースが必要とする小さな契約だけを用意すればよい。

### `configureStudyLog`の役割

Applicationのユースケースは、Repositoryのinterfaceだけへ依存しており、どの実装を使うか自分では決めない。

`configureStudyLog`が具体的なRepositoryを作り、取得と更新のユースケースへ渡す。

```ts
const repository = new InMemoryStudyLogRepository(initialStudyLogs)

return {
  getStudyLogSummary: createGetStudyLogSummary(repository),
  updateStudyLog: createUpdateStudyLog(repository),
}
```

このように、具体的な実装を生成して組み合わせる場所をComposition Rootという。具体的な保存方法をこの場所へ集めることで、ApplicationやUIへInfrastructureの知識が広がることを防いでいる。

### 変更理由から見た影響範囲

- 入力エラーメッセージを変える：`studyLogForm.ts`
- フォームの見た目を変える：`StudyLogView.tsx`
- 保存後の画面遷移を変える：`StudyLogPage.tsx`
- 更新処理の流れを変える：`updateStudyLog.ts`
- 保存先をメモリからAPIへ変える：InfrastructureのRepositoryと`configureStudyLog.ts`
- 学習時間の業務ルールを変える：Domainの`studyLog.ts`

どの変更理由がどのファイルに対応するか説明できれば、責務分担が機能していると判断できる。

---

## branded typeと型テスト

### branded typeが必要になる理由

TypeScriptは、型の名前ではなく構造が同じかどうかを基準に代入可能性を判断する。

例えば、次の2つは名前が違っても、どちらも実質的には`string`である。

```ts
type StudyLogId = string
type UserId = string

const userId: UserId = 'user-1'
const studyLogId: StudyLogId = userId
```

この代入は型エラーにならない。しかし、ユーザーIDを学習ログIDとして使うことは、アプリの意味としては間違っている。

同様に、学習時間と点数が両方とも`number`なら、値を取り違えてもTypeScriptには区別できない。

```ts
type StudyMinutes = number
type Score = number

const score: Score = 80
const minutes: StudyMinutes = score
```

branded typeは、同じ`string`や`number`へ型上だけの名札を付け、このような意味の違いをTypeScriptに伝える仕組みである。

### 今回のbranded type

```ts
declare const studyLogIdBrand: unique symbol

type StudyLogId = string & {
  readonly [studyLogIdBrand]: 'StudyLogId'
}
```

この型は、次の2つを同時に満たす値を表す。

```text
stringである
StudyLogIdという型上の名札を持つ
```

通常の`string`には名札がないため、そのまま代入できない。

```ts
const rawId: string = 'log-1'

// 型エラー
const id: StudyLogId = rawId
```

`StudyDurationMinutes`も同じ考え方である。

```ts
type StudyDurationMinutes = number & {
  readonly [studyDurationMinutesBrand]: 'StudyDurationMinutes'
}
```

普通の`number`と、検証済みの学習時間を型上で区別している。

### 名札は実行時には存在しない

brandはTypeScriptの型検査だけで使用され、JavaScriptとして実行するときには消える。

```ts
const studyLog = createStudyLog({
  id: 'log-1',
  topic: 'TypeScript',
  durationMinutes: 30,
})

console.log(studyLog)
```

実行時の値は通常のオブジェクトである。

```ts
{
  id: 'log-1',
  topic: 'TypeScript',
  durationMinutes: 30
}
```

`id`へ特別なプロパティが追加されたり、`durationMinutes`が特殊な数値オブジェクトになったりするわけではない。

そのため、branded type自身には「30が正しい学習時間か」を実行時に検証する能力はない。

### 生成関数を通す理由

外部から受け取った`string`や`number`は、最初は未検証の値である。

```text
フォーム・API・ファイル
        ↓
未検証のstring / number
```

`createStudyLog()`が値を検証し、正しい場合だけbrandを付ける。

```ts
if (
  !Number.isInteger(durationMinutes) ||
  durationMinutes <= 0 ||
  durationMinutes > 24 * 60
) {
  throw new Error('学習時間は1〜1440の整数で指定してください。')
}

return {
  id: normalizedId as StudyLogId,
  topic: normalizedTopic,
  durationMinutes: durationMinutes as StudyDurationMinutes,
}
```

データの流れは次のようになる。

```text
未検証のnumber
      ↓ createStudyLogで検証
StudyDurationMinutes
      ↓
Domain内部では検証済みとして扱える
```

`as StudyDurationMinutes`は検証の代わりではない。直前の条件分岐で正しさを確認したうえで、「ここから先は検証済みとして扱う」とTypeScriptへ伝えている。

アプリのさまざまな場所で直接`as StudyDurationMinutes`と書くと、検証を通さず名札だけを付けられてしまう。そのため、brandを付ける型アサーションは生成関数の中へ限定する。

### 型テストが確認していること

`studyLog.type-test.ts`では、未検証の値をbranded typeへ代入できないことを確認している。

まず、`@ts-expect-error`がない場合を考える。

```ts
const invalidId: StudyLog['id'] = 'plain-string'
```

`StudyLog['id']`は`StudyLogId`を意味する。右側は普通の`string`なので、`tsc`は型エラーを出す。

```text
stringはStudyLogIdへ代入できない
```

これは、未検証のIDがDomainへ入ることを型が防いでいる証拠である。

### `@ts-expect-error`の意味

型テストでは、意図的に間違ったコードを書く。

```ts
// @ts-expect-error 検証前のstringはStudyLogIdとして扱えない
const invalidId: StudyLog['id'] = 'plain-string'
```

`@ts-expect-error`は「エラーを無視する」というより、「次の行は型エラーになるはず」とTypeScriptへ宣言するコメントである。

結果は次のようになる。

```text
次の行が型エラーになる
    → 期待どおりなのでbuild成功

次の行が型エラーにならない
    → @ts-expect-errorが不要になったためbuild失敗
```

例えば、誤って`StudyLogId`を通常の`string`へ戻すと、代入が可能になる。

```ts
type StudyLogId = string
```

すると型エラーが発生しなくなり、TypeScriptが次のエラーを出す。

```text
Unused '@ts-expect-error' directive
```

これにより、「未検証の値を拒否する」という型の制約が弱くなったことをbuildで検出できる。

### `void invalidId`の意味

型テスト内の次の行は、branded typeの仕組みとは関係がない。

```ts
void invalidId
```

このプロジェクトでは未使用変数をエラーにする設定が有効である。そのため、変数を型テストで使用済みにする目的で書いている。

実行時に重要な処理を行っているわけではない。

### 実行時テストとの役割分担

branded typeの型テストと、生成関数の実行時テストは別の問題を確認している。

| 確認すること                                         | 検証方法                 |
| ---------------------------------------------------- | ------------------------ |
| 普通の`string`を`StudyLogId`へ代入できない           | `tsc`による型テスト      |
| 普通の`number`を`StudyDurationMinutes`へ代入できない | `tsc`による型テスト      |
| `0`や`1441`を学習時間として受け付けない              | Vitestによる実行時テスト |
| `1`と`1440`を正しい境界値として受け付ける            | Vitestによる実行時テスト |

```text
型テスト
「検証前と検証後の型を混同できないか」

実行時テスト
「生成関数の検証ルールは正しいか」
```

どちらか一方だけでは不十分である。branded typeだけでは外部入力の値を検証できず、生成関数だけでは未検証の値と検証済みの値を型上で区別できない。

### branded typeを使う判断基準

- 構造は同じだが、取り違えると不具合になる値に使う
- ID、金額、単位、検証済み文字列などが候補になる
- 生成・検証する入口を限定できる場合に使う
- すべての`string`や`number`へ機械的に付けない
- 単純な型で十分なら、型の複雑さを増やさない

---

## 理解確認で整理した補足

### Domain型の正しさは生成関数と組み合わせて守る

Domain型は業務上意味のある型だが、型名を書くだけで実行時の不正値を自動検証できるわけではない。

今回の`StudyLog`では、`createStudyLog`が空文字や学習時間の範囲を検証し、成功した値だけへbrandを付ける。Domain型と生成関数を組み合わせることで、「`StudyLog`なら業務ルールを満たしている」という前提を作っている。

```text
未検証のstring・number
        ↓ createStudyLogで検証
検証済みのStudyLog
```

### DTOが必要になる境界

DTOはAPI専用ではなく、外部とのデータ転送形式を表す型である。

- HTTP APIのリクエスト・レスポンス
- localStorageへ保存するJSON
- ファイルから読み込むデータ
- メッセージキューで送受信するデータ

現在はインメモリRepositoryがDomain型を直接扱い、外部形式との変換境界がない。そのためDTOを作っていない。

### FormValuesとFormErrorsでoptionalの理由が異なる

入力途中の不完全な値を許容するのは`StudyLogFormValues`である。

```ts
type StudyLogFormValues = {
  topic: string
  durationMinutes: string
}
```

`durationMinutes`も`string`にすることで、空文字や入力途中の値を保持できる。

一方、`StudyLogFormErrors`が`Partial`なのは、各フィールドにエラーがあるかどうかが独立しているためである。

```ts
{} // エラーなし
{ topic: '...' } // topicだけエラー
{ durationMinutes: '...' } // 学習時間だけエラー
{ topic: '...', durationMinutes: '...' } // 両方エラー
```

これらはすべて正しい組み合わせなので、各エラープロパティをoptionalにしてよい。

### Composition Root

`configureStudyLog`は、具体的なRepositoryを生成し、Applicationのユースケースへ渡して組み合わせる。

```ts
const repository = new InMemoryStudyLogRepository(initialStudyLogs)

return {
  getStudyLogSummary: createGetStudyLogSummary(repository),
  updateStudyLog: createUpdateStudyLog(repository),
}
```

このように、具体的な実装を生成して部品同士を配線する場所をComposition Rootという。

Applicationは`StudyLogReader`や`StudyLogWriter`という契約だけを知り、どのRepository実装を使用するかはComposition Rootが決める。

### `useMemo`は計算の大きさから判断する

`useMemo`を使うかどうかは、アプリ全体の規模ではなく、対象の計算コストと参照を安定させる必要性から判断する。

採用を検討するのは、次のような場合である。

- 大量データの複雑な集計や並び替えがある
- 再計算が実際に性能問題になっている
- 子コンポーネントへ渡す値の参照を安定させる必要がある

今回のフィルタは小さな配列に対する単純な文字列検索であり、`useMemo`の依存配列やコード量に見合う根拠がないため削除した。

### 編集から再表示までの流れ

```text
Form型として入力値を保持
        ↓
toStudyLogで検証
        ↓
Domain型へ変換
        ↓
updateStudyLogユースケース
        ↓
StudyLogWriterの契約
        ↓
Repositoryが保存
        ↓
StudyLogPageがreload
        ↓
Repositoryから再取得
        ↓
useStudyLogSummaryがViewModelへ変換
        ↓
StudyLogViewが再表示
```

---

## 試した型設計

### 対象

- `StudyLog`のDomain型
- 入力途中を表すForm型
- 表示用のViewModel
- 非同期取得と編集処理のUI状態
- 状態ごとに必要な値と操作が異なるコンポーネントprops

### 型で防ぎたい問題

- 未検証のIDや学習時間をDomain型として扱うこと
- 成功と失敗の値が同時に存在すること
- `loading`や`error`に不要な保存処理を渡すこと
- `success`なのに表示データや保存処理がないこと

### 採用した設計

- IDと学習時間のbranded type
- 生成関数による正規化、実行時検証、brandの付与
- `ok`、`status`を判別キーにしたdiscriminated union
- Form型からDomain型、Domain寄りの値からViewModelへの明示的な変換
- `StudyLogReader`と`StudyLogWriter`に分けた小さなRepository契約

### 比較した別案

- DTOの先行作成：外部とのデータ転送境界がまだないため見送った
- optional propsによるUI状態表現：矛盾した組み合わせを作れるため見送った
- genericsによる共通化：共通の関係を持つ複数の具体例がまだないため見送った
- フィルタ処理の`useMemo`：計算が軽く、複雑さに見合う性能上の根拠がないため削除した

---

## 現在の理解を確認するチェックリスト

- [ ] Domain型、Form型、DTO、ViewModelの違いを説明できる
- [ ] discriminated unionでUI状態を表現できる
- [ ] optional propsの増殖が起こす問題を説明できる
- [ ] ContainerとPresentationalを分ける基準を説明できる
- [ ] `satisfies`、`as const`、genericsを目的に応じて使える
- [ ] branded typeを採用する基準を説明できる
- [ ] 不正なpropsの組み合わせを型エラーにできる
