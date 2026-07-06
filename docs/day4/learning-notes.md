# 4日目 学習ノート

テーマ：Server State、API境界、データ正規化

関連資料：[ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [振り返り](./retrospective.md)

---

## 学んだこと

実装中に理解した内容を、コードの説明だけでなく「なぜその設計にしたか」が後から分かる形で記録する。

### server stateとclient state

| 分類          | 今回の値                         | 管理方法                               |
| ------------- | -------------------------------- | -------------------------------------- |
| server state  | APIに保存された学習ログ一覧      | `useStudyLogSummary`が取得・再取得する |
| client state  | 選択中ID、編集・削除状態         | `useStudyLogInteraction`で管理する     |
| form state    | 入力途中の内容、時間、学習日     | editor stateで文字列として管理する     |
| URL state     | 検索語、並び順                   | URL search paramsを情報源にする        |
| derived state | 合計時間、表示用一覧、選択中ログ | 元の値から計算する                     |

server stateの正本はAPIにあり、Frontendの一覧は取得時点のsnapshotである。mutation成功後はAPIから再取得し、画面だけを独自に正本として扱わない。

### API clientの責務

`HttpStudyLogRepository`を追加し、base URLとfetch互換関数をconstructorから受け取る設計にした。Viewやcustom hookはURL、HTTP method、header、JSON形式を知らず、既存の`StudyLogRepository`契約だけを利用できる。

`fetch`はHTTP errorでrejectされないため、`response.ok`と契約で定めたstatusを確認する。非2xx responseは`StudyLogApiError`へ変換し、statusとAPIのerror codeを保持する。APIの`message`はそのまま利用者へ表示しない。

### DTOのruntime validation

Zodを導入し、`response.json()`の結果を`unknown`としてDTO schemaで検証する。型アサーションは実行時検証を行わないため使用しない。

一覧responseは配列と各要素のfieldを検証し、追加・更新responseも単一DTOとして検証する。JSON解析失敗、DTOの型違い、Domain制約違反、成功statusの契約違反は`InvalidStudyLogResponseError`として扱う。

### DTO、Domain、ViewModelの変換

API DTOは`duration_minutes`、`studied_on`というsnake_caseを使い、Domainは既存の`durationMinutes`、`studiedOn`を維持する。

```text
response JSON
  ↓ Zodによる構造検証
StudyLogDto
  ↓ createStudyLogによるDomain検証
StudyLog
```

追加・更新では逆に、検証済みの`StudyLog`からrequest DTOへ変換する。DTOの変更をInfrastructure層で吸収するため、Domain、use case、ViewModelはAPI固有のfield名へ依存しない。

### Remote Dataの状態設計

既存の`StudyLogViewState`が`loading`、`empty`、`error`、`success`をdiscriminated unionで表しているため、API化後も再利用した。

取得エラー時には「再試行する」操作を追加した。再試行では`reload()`が画面を`loading`へ戻し、新しい一覧取得を開始する。

### retry、abort、stale response

一覧取得は読み取り処理なので、利用者による再試行を許可する。追加、更新、削除は、サーバー側で成功してresponseだけ失われた可能性があるため、現時点では無条件な自動retryを行わない。

`useStudyLogSummary`では各Effectが`isActive`を持ち、新しい取得やunmountによってcleanupされた古いEffectは結果をstateへ反映しない。これにより、古いresponseが新しい一覧を上書きすることを防ぐ。

さらに、Effectごとに`AbortController`を作り、cleanupで`abort()`する。`AbortSignal`はuse case、`StudyLogReader`、`HttpStudyLogRepository`を通ってfetchへ渡す。active flagはstate更新を防ぎ、AbortControllerは不要なHTTP通信自体の中断を要求するため、役割が異なる。

### cacheと再取得

現状は明示的なcacheを持たず、画面表示時とmutation成功後に一覧を再取得する。データ量が少なく単一画面だけで使うため、まず挙動が明確な設計を優先した。

cacheを導入する場合、現在の一覧keyは`['study-logs']`とする。mutation成功後はこのkeyをinvalidateし、サーバー上の最新一覧を再取得する。

手動のエラー確認ではブラウザのHTTP cacheが一覧responseを返し、API停止を再現しにくい問題があった。アプリ内cacheとは別の問題なので、APIの`/study-logs` responseへ`Cache-Control: no-store`を付けた。APIの全4テストとbuildが成功した。

その後、APIの起動terminalを停止しても`tsx watch`の子Nodeプロセスがport 3000で待受を続けていることが分かった。残存プロセスを停止して初めて、実際のnetwork errorを再現できた。

APIを完全に停止した状態で取得エラーが表示され、API再起動後に「再試行する」を押すと一覧へ復帰できることを手動確認した。

### TanStack Queryの採用判断

現時点では導入を見送る。queryは学習ログ一覧の1種類で利用画面も1つだけであり、loading、error、retry、abort、stale response、mutation後の再取得を自作hookで小さく明示できているためである。

TanStack Queryを導入するとProvider、query key、query function、mutation、invalidationなどの概念と依存が増える。現状では得られる利点より学習・実装コストのほうが大きい。

次の要求が現れたら再検討する。

- 複数画面が同じserver stateを共有する
- 取得条件ごとのcacheが増える
- 画面復帰時や一定条件でのbackground refetchが必要になる
- requestの重複排除や共通retry方針が必要になる
- mutation後に複数queryをinvalidateする

## 試したこと

### API仕様と失敗条件の確認

Frontendとは別のAPIリポジトリを用意し、HTTPだけを通して学習ログへアクセスする方針とした。最初はAPI境界の学習へ集中するため、認証やDatabaseを持たないインメモリCRUDとする。

APIは`GET /study-logs`、`POST /study-logs`、`PUT /study-logs/:id`、`DELETE /study-logs/:id`を公開する。API DTOはsnake_case、FrontendのDomain型はcamelCaseとし、`HttpStudyLogRepository`で変換する。

詳しいDTO、status、エラー形式は[API契約](./api-contract.md)へ記録した。

APIはFrontendと同じ`study_logs`ディレクトリ配下の別リポジトリ`API`へ作成した。Node.js、TypeScript、Express、Zodを使い、Frontendの開発originからのCORS requestだけを許可する。

```text
study_logs/
├─ FE/
└─ API/
```

初期実装ではインメモリのMapへ学習ログを保持する。サーバー再起動で初期値へ戻るが、Day4ではDatabaseではなくFrontendのserver stateとAPI境界を学ぶことを優先する。

API側では次を確認した。

- 一覧取得、追加、更新、削除を一連のテストで実行できる
- 不正なtopic、時間、実在しない日付を持つDTOを`400`で拒否できる
- 初期実装のAPIテスト2件が成功する
- TypeScript buildが成功する

### 初期一覧が表示されない問題

APIは`200`で一覧を返していたが、CORSでは`http://localhost:5173`だけを許可していた。Frontendを`http://127.0.0.1:5173`で開くと別originになるため、ブラウザがresponseの利用を拒否していた。

APIで開発時に使う次の2つのoriginを許可した。

- `http://localhost:5173`
- `http://127.0.0.1:5173`

CORS response headerを確認するAPIテストを追加し、APIの全3テストとbuildが成功した。HTTPでAPIへ到達できることと、ブラウザがそのresponseを利用できることは別々に確認する必要がある。

### `study-logs` request自体が送信されない問題

`globalThis.fetch`をそのままRepositoryのprivate fieldへ保存し、`this.#fetch(...)`として呼び出していた。この形では呼び出し時の`this`がRepositoryになり、ブラウザのnative fetchが通信開始前に失敗する環境がある。

既定のfetchを次のwrapper関数に変更し、global functionとして呼び出すようにした。

```ts
function fetchFromGlobal(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init)
}
```

`configureStudyLog`もraw fetchを明示的に渡さず、Repositoryの安全な既定値を使う。テストでfetchの呼び出しcontextを確認し、Frontendの全98テスト、lint、buildが成功した。

修正後、ブラウザのNetworkに`GET /study-logs`が送信され、APIの初期データ2件を画面へ表示できることを手動確認した。

画面から新規追加、更新、削除を実行し、`POST`、`PUT`、`DELETE`が成功することを確認した。各mutation成功後に`GET /study-logs`で再取得され、APIの最新データが画面へ反映されることも確認した。

### 検索と詳細表示

`configureStudyLog`で`LocalStorageStudyLogRepository`の代わりに`HttpStudyLogRepository`を組み立てるよう変更した。APIのbase URLは`VITE_STUDY_LOG_API_URL`から受け取り、未設定時は`http://localhost:3000`を使う。

Domain、use case、編集用reducer、ViewModelは変更せず、Repositoryの差し替えだけで一覧取得とCRUDの保存先をAPIへ変更できた。

### 異常系と競合のテスト

`HttpStudyLogRepository`へfetch mockを注入し、実際のAPIを起動せず次をテストした。

- 一覧DTOからDomainへの変換
- 追加、更新、削除のURL、method、request DTO
- DTOの型違いとDomain制約違反
- HTTP errorのstatusとcode
- 成功statusの契約違反

Repositoryのテスト10件を追加した。さらに、取得失敗後の再試行、古いresponseを無視するhook、AbortSignalを各層へ渡す処理のテストを追加した。Frontendの全98テスト、lint、buildが成功した。

## 理解度確認

### 第1問：Zod検証後にDomain生成処理を通す理由

ZodによるDTO検証は、API responseが必要なfieldとデータ型を持つことを確認する。構造が正しくても、時間の範囲や日付の実在性などのDomainルールを満たすとは限らない。

そのため、DTO検証後に`createStudyLog`を通し、Domainの不変条件を満たす値だけをbranded typeを持つ`StudyLog`へ変換する。

### 第2問：GETとPOSTでretryの安全性が異なる理由

GETはリソースを変更しない安全な操作であり、同じ一覧取得を繰り返しても学習ログ自体は増減しない。そのため、一時的な通信失敗後に再試行しやすい。

POSTでは、API側の追加処理が成功した後にresponseだけが失われる可能性がある。クライアントからは失敗に見えても、同じrequestを再送すると一般にはデータを二重作成する危険がある。

今回のAPIではFrontendがIDを生成し、同じIDへの追加を`409 Conflict`にするため二重作成は防げる。ただし、retry後の`409`が「最初の追加は成功していた」結果なのか、別の処理による本当のID競合なのかを判断する必要がある。mutationの自動retryには、同じrequestを安全に再実行できるidempotencyの設計が必要になる。

### 第3問：active flagだけではHTTP通信を中断できない

`useStudyLogSummary`の`isActive`は、古いPromiseが完了してもstateへ反映しないためのflagであり、すでに開始したHTTP通信そのものは止めない。

通信も止めるには`AbortController`を作り、その`signal`をfetchまで渡して、Effectのcleanupで`abort()`する必要がある。ただしabort要求とresponse完了が競合する可能性もあるため、active flagによるstate更新のguardも維持する。

### 第4問：AbortControllerとactive flagを併用する理由

`abort()`は通信の中断を要求するが、常にPromiseの完了を防げるとは限らない。responseがすでに完了している場合、完了処理がmicrotaskへ登録済みの場合、または利用するRepositoryがAbortSignalを処理しない場合は、そのPromiseがresolveまたはrejectする可能性がある。

`isActive`はEffectのcleanup後に`false`となり、Promiseが完了しても古い処理からReact stateを更新しない。

このguardがなければ、古いresponseが新しい一覧を上書きしたり、すでにunmountされた画面のstateを更新しようとしたりして、現在の画面と対応しない状態になる可能性がある。

```text
AbortController → 不要な通信を可能なら止める
isActive        → 完了してしまった古い処理からstateを守る
```

役割が異なるため、通信資源の節約とstale response対策の両方を目的として併用する。

### 第5問：学習ログ一覧のcache key

cache keyは、キャッシュしたserver stateが「どのデータ取得に対応するか」を一意に識別する名前である。

現状のAPIは検索条件や並び順を受け取らず、学習ログ一覧は1種類しかないため、次のkeyで表せる。

```ts
const queryKey = ['study-logs']
```

将来、API側で検索や並び替えを行う場合は、その条件によってresponseが変わる。条件をkeyへ含めないと異なる取得結果が同じキャッシュを共有してしまうため、次のように区別する。

```ts
const queryKey = ['study-logs', { query, sortOrder }]
```

たとえばReact検索とTypeScript検索で同じkeyを使うとkeyが衝突し、Reactを検索した画面へTypeScript検索のキャッシュが表示されるなど、条件と結果が食い違う可能性がある。

### 第6問：mutation成功後にキャッシュをinvalidateする理由

`invalidate`はデータを検証する`validate`とは異なり、キャッシュを「古いデータ」として扱うよう印を付ける操作である。

POST、PUT、DELETEが成功すると、サーバー上の学習ログ一覧は変わる。一方、`['study-logs']`に保存された一覧はmutation前のままなので、そのまま使うと古い画面表示になる。

```text
mutation成功
  ↓
['study-logs']をinvalidate
  ↓
一覧を再取得
  ↓
サーバーとキャッシュが一致
```

現在の自作hookではキャッシュを持っていないため、mutation成功後に`reload()`して一覧を再取得する処理が近い役割を担っている。

### 第7問：staleTimeの意味

`staleTime`は、取得したserver stateをfresh、つまり通常は再取得不要とみなす期間である。

たとえば`staleTime`が5分なら、取得後5分間は新鮮なデータとして扱い、5分を過ぎるとstaleになって再取得の対象になり得る。5分後にキャッシュ自体が削除されるわけではない。

未使用になったキャッシュをメモリへ保持してから削除するまでの期間は、garbage collectionに関する別の設定である。

### 第8問：現時点でTanStack Queryを導入しない理由

現在はqueryが学習ログ一覧の1種類、利用画面も1つであり、取得、再試行、abort、stale response対策、mutation後のreloadを自作hookで小さく実装できている。

TanStack Queryを導入するとcacheやinvalidationを任せられる一方、Providerやquery keyなどの新しい依存と概念が増える。現状では解決する問題より導入コストのほうが大きいため、見送る。

ライブラリを使わないこと自体が目的ではない。server stateの種類と利用箇所が増え、自作のcache、重複排除、background refetch、invalidation管理が複雑になった段階で再検討する。

### 第9問：network errorとHTTP errorの違い

APIサーバーが停止して接続できない場合は、HTTP response自体を受け取れないnetwork errorとなり、`fetch`のPromiseがrejectされる。

404などはAPIへ接続でき、HTTP responseを受け取っているため、`fetch`のPromiseはresolveする。ただし`response.ok`は`false`である。

```text
接続不能
  └─ responseなし → fetchがreject

404 / 500
  └─ responseあり → fetchはresolve、response.okはfalse
```

そのため`catch`だけではHTTP errorを検出できない。`HttpStudyLogRepository`で`response.ok`を確認し、非2xx responseを`StudyLogApiError`へ変換する。

### 第10問：API DTOのfield名が変わったときの修正範囲

API DTOの`duration_minutes`が`study_minutes`へ変わった場合、FrontendではDTO schemaと、DTOからDomain、Domainからrequest DTOへ変換する`HttpStudyLogRepository`を主に修正する。API契約とBackend側のDTOも同じ変更へ揃える。

Domainの`durationMinutes`が表す業務上の意味は変わらないため、Domain、use case、custom hook、reducer、ViewModel、Viewは基本的に再利用する。

ただしfield名だけでなく値の意味や単位も変わる場合は、Infrastructure層だけで変換して吸収できるか、Domain自体の変更が必要かを改めて判断する。

## 疑問・確認したいこと

-
