# 4日目 学習ガイド

テーマ：Server State、API境界、データ正規化

関連資料：[ドキュメント案内](./README.md) / [API契約](./api-contract.md) / [学習ノート](./learning-notes.md) / [振り返り](./retrospective.md) / [カリキュラム](../../react-typescript-ai-coding-curriculum.md)

## 今日のゴール

APIから受け取った値をそのまま信用せず、外部データの検証と変換を境界へ閉じ込め、安全なDomain型と画面用ViewModelとして利用できるようになる。

さらに、server state固有のloading、empty、error、success、再取得、再試行、キャンセル、古いレスポンスを状態とイベントとして説明し、テストできるようになる。

## 今日作るもの

Day3までに作った学習ログアプリを、そのままAPI版へ発展させる。

- `StudyLogRepository`の既存契約を維持する
- `LocalStorageStudyLogRepository`とは別に`HttpStudyLogRepository`を作る
- `configureStudyLog`で利用するRepositoryをAPI版へ差し替える
- 一覧取得、追加、更新、削除をHTTP経由で行う
- loading、0件、取得失敗、成功を表示する
- 取得失敗後の再試行と、更新後の再取得を行える
- APIレスポンスをruntime validationする
- DTOをDomainの`StudyLog`へ変換してからApplication層へ返す
- 古いresponseで新しい画面状態を上書きしない

既存のDomain、use case、reducer、custom hook、Viewは、API化だけを理由に書き換えない。実際に変更が必要になった箇所では、Repository契約の不足なのか、通信時間による新しいUI要件なのかを区別する。

このフロントエンドには接続先APIがまだないため、実装開始時にローカルの学習ログAPIを用意する。APIサーバーの作り込みは目的にせず、次のHTTP契約を再現できる最小構成にする。

```text
GET    /study-logs      一覧取得
POST   /study-logs      新規追加
PUT    /study-logs/:id  既存更新
DELETE /study-logs/:id  削除
```

具体的なDTO、status、エラー形式は[API契約](./api-contract.md)に定義する。実装前に契約と既存の`StudyLogRepository`を対応づけ、学習ノートへ判断を記録する。

## 達成目標

### 1. server stateをclient stateから分ける

server stateは、画面が所有する唯一のデータではなく、外部システムに正本がある状態である。

| 分類          | 例                                 | 主な関心事                       |
| ------------- | ---------------------------------- | -------------------------------- |
| server state  | APIに保存された学習ログ一覧        | 取得、再取得、cache、stale、同期 |
| client state  | 選択中の学習ログID、編集・削除状態 | 画面内の操作と寿命               |
| form state    | 入力途中の内容、時間、学習日       | 入力、検証、送信                 |
| URL state     | 検索条件、並び順                   | 共有、復元、履歴                 |
| derived state | 合計時間、表示用一覧、選択中のログ | 元の値から計算                   |

server stateを扱うときは、値だけでなく次も設計する。

- まだ取得していない
- 取得中
- 取得結果が0件
- 取得に失敗した
- 取得に成功した
- 画面の値が古く、再取得が必要

### 2. Remote Dataをdiscriminated unionで表す

複数のbooleanとoptionalな値を組み合わせると、`loading`なのに`error`と`data`も存在するような矛盾を作れる。

```ts
type RemoteData<T> =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'success'; data: T }>
```

再取得中も以前のデータを表示する設計なら、初回loadingとrefetchingを分ける。

```ts
type RemoteData<T> =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{
      status: 'success'
      data: T
      isRefetching: boolean
    }>
```

emptyを独立状態にするか、`success`の空配列として扱うかは、UIで異なる操作や表示が必要かを基準に決める。

### 3. API版Repositoryの責務を限定する

`HttpStudyLogRepository`はHTTP境界の詳細を担当する。

- endpointとquery parameterを組み立てる
- `fetch`へmethod、header、`AbortSignal`を渡す
- HTTP statusを確認する
- bodyをJSONとして読み取る
- JSONを`unknown`として返す、またはschemaでDTOへ変換する
- 通信、HTTP、JSON、validationの失敗を呼び出し側へ伝える

Viewやcustom hookから直接`fetch`しない。UIやuse caseへHTTP status、API固有のfield名、JSON構造を漏らさない。

```text
View
  ↓ ユーザー操作
custom hook / use case
  ↓ StudyLogRepositoryの契約
HttpStudyLogRepository
  ↓ HTTP
学習ログAPI
```

`fetch`は404や500で自動的にrejectされないため、`response.ok`を明示的に確認する。rejectされる通信エラーと、responseを受け取ったHTTPエラーを区別する。

現在の`StudyLogReader.findAll()`は引数を受け取らない。古いresponse対策は、まずcustom hookでEffectごとのactive flagやrequest IDを確認すれば、既存契約を変更せず実装できる。通信自体も中断する必要がある場合は、次のようなoptionを契約へ追加する判断を行う。

```ts
type RequestOptions = Readonly<{
  signal?: AbortSignal
}>

interface StudyLogReader {
  findAll(options?: RequestOptions): Promise<readonly StudyLog[]>
}
```

API化したから無条件に契約を変えるのではなく、Application層が「処理のキャンセル」を要求する必要があるかで判断する。`AbortController`そのものではなく、標準的な`AbortSignal`だけを渡す。

テストでは本物の通信へ依存しないよう、API版Repositoryへ`fetch`互換関数とbase URLを外から渡せる設計を検討する。

### 4. 外部データを`unknown`から検証する

TypeScriptの型注釈や型アサーションは実行時のレスポンスを検証しない。

```ts
// 実行時検証にはならない
const dto = (await response.json()) as StudyLogDto[]
```

外部から来た値は`unknown`として受け取り、次を確認する。

- objectまたはarrayか
- 必須fieldが存在するか
- 各fieldの型が正しいか
- `null`を許可するfieldか
- URLや数値などに追加制約があるか
- 画面で不要なfieldを無視できるか

手書きのtype guardから始めてもよい。検証項目が増え、schemaと型推論を一元化したい場合はZodの導入を検討する。

現在のプロジェクトにはZodが未導入である。導入する場合は、追加理由と手書きvalidationとの比較を学習ノートへ記録する。

### 5. DTO、Domain、ViewModelを分ける

同じデータでも境界ごとに責務が異なる。

```text
API response
    ↓ runtime validation
DTO
    ↓ Domain生成・正規化
Domain
    ↓ UI向け変換
ViewModel
    ↓
View
```

| モデル    | 役割                               | API変更の影響  |
| --------- | ---------------------------------- | -------------- |
| DTO       | APIのfield名とnullabilityを表す    | 受ける         |
| Domain    | 検証済みの`StudyLog`を表す         | 境界で吸収する |
| ViewModel | 学習時間や学習日の表示文字列を表す | UI要件を受ける |

APIでは、たとえば`duration_minutes`や`studied_on`のような外部表現を利用する可能性がある。DTOをViewやuse caseへ直接渡すと、APIのfield名とnullabilityが内側へ漏れる。

`HttpStudyLogRepository`の境界でDTOを検証し、既存の`createStudyLog`を通してDomainへ変換する。外向きの追加・更新では、DomainからAPIのrequest DTOへ変換する。

```text
response JSON
  ↓ runtime validation
StudyLogDto
  ↓ createStudyLog
StudyLog

StudyLog
  ↓ request DTOへ変換
POST / PUTのJSON
```

### 6. エラーを利用者が扱える形へ変換する

内部では失敗原因を区別する。

- network error
- HTTP error
- JSON parse error
- validation error
- aborted request

UIでは、利用者が次にできる操作に合わせてメッセージを決める。

- 再試行できる通信失敗
- 修正が必要なrequestや認証の問題
- アプリ側の想定外データ
- 新しい一覧取得によって不要になったabort

abortは通常の取得失敗として表示せず、古いリクエストを終了した結果として無視する。

### 7. retryを無条件に行わない

再試行が有効なのは、一時的な通信失敗など、同じ要求を繰り返すことで成功する可能性がある場合である。

再試行前に考える。

- 同じ要求を再送して安全か
- 入力や認証の問題ではないか
- 利用制限を悪化させないか
- 最大回数と待機時間をどうするか
- 自動再試行か、利用者による再試行か

一覧取得では、まず「エラー画面の再試行ボタン」から実装する。追加、更新、削除は、サーバー側では成功したのにresponseだけ失われた可能性があるため、無条件な自動retryで処理が重複しないかを考える。

### 8. abortとstale responseを区別する

初回取得Aの途中で、保存後の再取得Bを開始すると、AがBより後に完了する可能性がある。

```text
request A ───────────────→ response A
       request B ──→ response B
```

何も対策しないと、古いresponse Aが保存後の新しい一覧Bを上書きする。

主な対策：

- 新しい一覧取得時に前のrequestを`AbortController`で中断する
- request IDを発行し、最新IDと一致するresponseだけ反映する
- query keyごとに結果を管理するライブラリを使う

abortできても、処理の段階によっては完了済みresponseが残る場合がある。最終的に「このresponseが現在のrequest IDと一致するか」を確認すると堅牢になる。

### 9. cache戦略を言葉で決める

cacheを導入する前に、次の用語を説明できるようにする。

| 用語               | 意味                                      |
| ------------------ | ----------------------------------------- |
| cache key          | どの取得条件のデータかを識別するキー      |
| stale time         | 取得結果を新鮮とみなす時間                |
| refetch            | 同じ条件のデータを再取得すること          |
| invalidation       | cacheを古いものとして再取得対象にすること |
| garbage collection | 未使用cacheを保持した後に破棄すること     |

学習ログ一覧には、機能と取得条件を表すcache keyを使う。将来API側で検索や並び替えを行うなら、その条件もkeyに含める。

```ts
const queryKey = ['study-logs', { query, sortOrder }]
```

stale timeは「長いほど高速、短いほど正確」という単純な設定ではない。データの更新頻度、古い表示の影響、API利用制限、利用者が期待する鮮度で決める。

### 10. TanStack Queryの導入を判断する

現在のプロジェクトにはTanStack Queryが未導入である。まず`fetch`、custom hook、AbortControllerでserver stateの基本を実装し、何が難しいかを把握する。

次の要求が増えたら導入価値を再評価する。

- query keyごとのcache
- stale timeと自動refetch
- retry方針の共通化
- 複数画面で同じserver stateを共有
- mutation後のinvalidation
- requestの重複排除

単一画面で取得が少ない段階では、自作hookのほうが依存と挙動を理解しやすい場合がある。機能が増えた段階では、cacheと非同期状態を自作し続けるコストがライブラリ導入コストを上回る可能性がある。

## 推奨する責務分担

```text
features/study-log/
├─ application/
│  ├─ ports/
│  │  └─ StudyLogRepository.ts
│  └─ use-cases/
├─ domain/
│  └─ studyLog.ts
├─ infrastructure/
│  ├─ HttpStudyLogRepository.ts
│  ├─ studyLogDto.ts
│  └─ studyLogSchema.ts
├─ ui/
│  ├─ StudyLogPage.tsx
│  ├─ StudyLogView.tsx
│  └─ useStudyLogSummary.ts
└─ configureStudyLog.ts
```

- View：表示とユーザー操作の通知
- custom hook：取得・再取得の手順、Remote Data、abort、stale response対策
- use case：一覧取得、追加、更新、削除というアプリの操作
- port：Applicationが外部へ要求する契約
- API版Repository：HTTP、DTO validation、Domainとの相互変換、外部エラー
- mapper：DTOからDomainまたはViewModelへの変換

実際の複雑さに合わないファイルは無理に作らず、責務が分かれる時点で分割する。

## テスト方針

### API版Repository

- `findAll`の正常なresponseをDTOとして検証し、Domainへ変換できる
- `add`、`save`、`remove`が正しいmethod、URL、bodyを使う
- HTTP errorを成功データとして扱わない
- JSONが壊れている場合に失敗する
- field欠落、型違い、想定外の`null`を拒否する
- reader契約へsignalを追加した場合、`AbortSignal`をfetchへ渡す

### mapper

- nullableなDTOを安全なDomainまたはViewModelへ変換する
- 表示用文字列とfallbackを正しく作る
- DTOの不要fieldをUIへ漏らさない

### custom hook

- 初期状態からloading、successへ遷移する
- 0件をemptyとして扱う
- 失敗後に再試行できる
- 新しい一覧取得で以前のrequestを中断するか、古いresponseを無視する
- 古いresponseを現在の結果へ反映しない
- 追加、更新、削除の成功後に最新一覧を取得する
- mutation失敗時に入力や選択を維持する

### 画面全体

- APIから取得した学習ログを表示できる
- loading中の表示と操作制御が正しい
- 0件時に適切な案内を表示する
- error時に再試行できる
- API経由で追加、更新、削除できる
- 一覧から詳細を選択し、フィルタと並び替えを利用できる

ローカルAPIへ常時接続するテストではなく、API版Repositoryへ渡すfetch互換関数やRepository自体を差し替え、成功、失敗、遅延、異常DTOを決定的に再現する。

## 7.5時間の進め方

1. 45分：ローカルAPIの契約、起動方法、成功・失敗responseを確認する
2. 90分：DTO、runtime validation、Domain、ViewModel、API版Repositoryの境界を設計する
3. 165分：API版Repository、一覧取得、CRUD、再取得、再試行を実装する
4. 60分：loading、empty、error、invalid DTO、abort、stale responseをテストする
5. 60分：cache、retry、validation、TanStack Queryの採用判断をレビューする
6. 30分：判断理由、見送った案、残課題を学習ノートと振り返りへ記録する

## 実装前のチェックリスト

- [x] ローカル学習ログAPIの実装方法と起動方法を決めた
- [x] `GET / POST / PUT / DELETE`のHTTP契約を決めた
- [x] 一覧取得とCRUDの成功responseを確認した
- [x] network、HTTP、JSON、validationの失敗を列挙した
- [x] server、client、form、URL、derived stateを分類した
- [x] 既存の`StudyLogRepository`契約でAPI版を実装できるか確認した
- [x] DTOとruntime validationの方法を決めた
- [x] DTOからDomain、ViewModelへの変換境界を決めた
- [x] Remote Dataの状態とeventを定義した
- [x] active flagに加えて`AbortSignal`をRepository契約へ追加した
- [x] retryする失敗と、retryしない失敗を決めた
- [x] cache keyと必要な鮮度を検討した
- [x] TanStack Queryを導入する判断基準を決めた

## 完了時のチェックリスト

- [x] 学習ログをAPIから取得して表示できる
- [x] API経由で追加、更新、削除できる
- [x] loading、empty、error、successを表示できる
- [x] エラー後に再試行できる
- [x] 外部データを`unknown`からruntime validationしている
- [x] DTOをViewへ直接渡していない
- [x] API固有のfield名とnullabilityを境界へ閉じ込めている
- [x] 新しい一覧取得時に古いrequestを中断し、そのresponseも無視できる
- [x] 古いresponseが新しい結果を上書きしない
- [x] API版Repository、mapper、custom hook、画面の主要テストがある
- [x] cache、stale time、refetch、invalidationを説明できる
- [x] TanStack Queryの採用または見送りの理由を説明できる
- [x] `npm run lint`、`npm run test`、`npm run build`が成功する
- [x] API境界の判断と改善候補を学習ノートと振り返りへ記録した

## 今日、説明・実演できれば合格

1. server stateとclient stateの違い
2. `fetch`がHTTP errorで自動rejectされない理由
3. API responseを`unknown`から検証する理由
4. DTO、Domain、ViewModelの役割と変換方向
5. loading、empty、error、successをunionで表す利点
6. network、HTTP、validation、abortを区別する理由
7. retryできる失敗と、retryすべきでない失敗
8. AbortControllerで古いrequestを中断する方法
9. stale responseが起きる順序と、その防止方法
10. cache key、stale time、refetch、invalidationの意味
11. TanStack Queryを採用する場合と見送る場合
12. API経由の一覧、追加、更新、削除、再取得、再試行、異常データが期待どおり動作すること

## Codexへのレビュー依頼例

```text
このAPI連携コードをレビューしてください。
runtime validation、DTO/ViewModel分離、Remote Dataの状態設計、
retry、abort、stale response、cache key、stale time、
TanStack Queryを使うべきかの観点で改善案を出してください。
```
