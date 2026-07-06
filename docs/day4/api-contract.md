# 学習ログAPI契約

Day4では、Frontendと別リポジトリに最小の学習ログAPIを用意する。APIはインメモリでデータを保持し、FrontendはHTTPだけを通してアクセスする。

## Base URL

```text
http://localhost:3000
```

Frontendの開発originとして、次のCORS requestを許可する。

- `http://localhost:5173`
- `http://127.0.0.1:5173`

hostが異なるURLは別originとして扱われるため、開発時に利用する両方を明示する。

## DTO

APIの外部表現はsnake_case、FrontendのDomain型はcamelCaseとし、API版Repositoryで相互変換する。

```ts
type StudyLogDto = Readonly<{
  id: string
  topic: string
  duration_minutes: number
  studied_on: string | null
}>
```

### 制約

- `id`：trim後に1文字以上
- `topic`：trim後に1文字以上
- `duration_minutes`：1〜1440の整数
- `studied_on`：実在する`YYYY-MM-DD`形式、または`null`

## Error DTO

```ts
type ErrorDto = Readonly<{
  code: string
  message: string
}>
```

Frontendは`message`をそのまま利用者へ表示せず、statusと`code`をアプリ内のエラーへ変換する。

## Endpoints

### 一覧取得

```http
GET /study-logs
```

成功：

- status：`200 OK`
- body：`StudyLogDto[]`

### 新規追加

```http
POST /study-logs
Content-Type: application/json
```

request body：`StudyLogDto`

成功：

- status：`201 Created`
- body：作成した`StudyLogDto`

失敗：

- `400 Bad Request`：JSONまたは入力値が不正
- `409 Conflict`：同じIDがすでに存在する

IDはDay3までの設計を維持し、Frontendが新規作成開始時に生成する。APIは受け取ったIDの重複を検証する。

### 既存更新

```http
PUT /study-logs/:id
Content-Type: application/json
```

request body：`StudyLogDto`

pathのIDとbodyのIDは一致していなければならない。

成功：

- status：`200 OK`
- body：更新した`StudyLogDto`

失敗：

- `400 Bad Request`：JSON、入力値、またはIDの対応が不正
- `404 Not Found`：更新対象が存在しない

### 削除

```http
DELETE /study-logs/:id
```

成功：

- status：`204 No Content`
- body：なし

失敗：

- `404 Not Found`：削除対象が存在しない

## 共通エラー

- `404 Not Found`：endpointまたは対象データが存在しない
- `500 Internal Server Error`：想定外のサーバーエラー

`fetch`はHTTP errorでrejectされないため、FrontendのAPI版Repositoryは`response.ok`を確認する。

## Frontendとの対応

| API                      | Repository           |
| ------------------------ | -------------------- |
| `GET /study-logs`        | `findAll()`          |
| `POST /study-logs`       | `add(studyLog)`      |
| `PUT /study-logs/:id`    | `save(studyLog)`     |
| `DELETE /study-logs/:id` | `remove(studyLogId)` |

Repositoryはresponse JSONを`unknown`として受け取り、DTOのruntime validation後に`createStudyLog`でDomain型へ変換する。

## HTTP cache

学習ログはmutationによって変化する動的なserver stateなので、`/study-logs`のresponseには次のheaderを付ける。

```http
Cache-Control: no-store
```

これにより、ブラウザのHTTP cacheから古い一覧が返ることを防ぐ。これはTanStack Queryなどが管理するアプリ内cacheとは別の層である。

## Day4では扱わないこと

- 認証と認可
- Databaseへの永続化
- pagination
- API側の検索と並び替え
- 複数プロセス間の排他制御
- 本番環境へのデプロイ

これらはAPI境界、server state、通信競合の学習後に必要性を再評価する。
