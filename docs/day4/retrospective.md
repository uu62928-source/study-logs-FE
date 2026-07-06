# 4日目 振り返り

テーマ：Server State、API境界、データ正規化

関連資料：[ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [学習ノート](./learning-notes.md)

## 今日学んだこと

- server stateの正本はAPIにあり、Frontendの一覧は取得時点のsnapshotである
- 型アサーションでは外部データを検証できないため、`unknown`からruntime validationする
- DTOの構造検証とDomainの不変条件検証は役割が異なる
- `fetch`はnetwork errorではrejectするが、HTTP errorではresolveする
- abortとactive flagは、通信中断とstate保護という異なる役割を持つ
- cache keyにはresponseを変える取得条件を含める
- staleTime、invalidation、garbage collectionはそれぞれ別の概念である
- アプリ内cacheとブラウザのHTTP cacheは別の層である

## 実装したもの

- Frontendとは別リポジトリのNode.js、TypeScript製学習ログAPI
- 一覧取得、追加、更新、削除のHTTP endpoint
- ZodによるAPI requestの検証
- API DTOとエラーDTO、status codeを含むAPI契約
- Zodでresponse DTOを検証する`HttpStudyLogRepository`
- DTOとDomainの相互変換
- HTTP errorと不正responseを区別するエラー
- 取得失敗後の再試行
- AbortSignalによる通信中断とstale response対策
- CORSと`Cache-Control: no-store`
- APIテスト4件、Frontendテスト98件

## 採用した設計と理由

### server stateの管理

APIを学習ログの正本とし、Frontendは一覧を取得して表示する。client、form、URL、derived stateはDay3までの管理方法を維持し、server stateと混在させない。

mutation成功後はAPIから一覧を再取得し、画面とAPIを同期する。

### API境界

既存の`StudyLogRepository`契約を保ち、Infrastructure層へ`HttpStudyLogRepository`を追加した。HTTP method、URL、status、JSON、snake_caseのDTOをこの層へ閉じ込めた。

ZodでDTOの構造を検証した後、`createStudyLog`でDomain制約を検証する。API固有の変更をDomain、use case、ViewModelへ波及させない。

### Remote Dataの状態

既存の`StudyLogViewState`が持つ`loading`、`empty`、`error`、`success`を再利用した。取得失敗時には再試行操作を追加し、API復旧後に一覧へ戻れるようにした。

### 競合とキャンセル

EffectのcleanupでAbortControllerを中断し、不要なHTTP通信を止める。さらにactive flagを残し、abortが間に合わなくても古い処理からstateを更新しない。

GETは利用者が再試行できるようにした。POST、PUT、DELETEは処理成功後にresponseだけ失われる可能性があるため、無条件な自動retryを採用しなかった。

### キャッシュ戦略

現状は単一画面、単一queryなのでアプリ内cacheを導入せず、必要な時点で再取得する。cacheを導入する場合のkeyは`['study-logs']`とし、mutation後にinvalidateする。

TanStack Queryは現時点では見送る。複数画面での共有、条件別cache、background refetch、重複排除、複数queryのinvalidationが必要になった段階で再検討する。

## 理解度確認で整理できたこと

- DTO検証後もDomain生成処理が必要な理由
- GETとPOSTでretryの安全性が異なる理由
- active flagだけではHTTP通信を中断できないこと
- AbortControllerとactive flagを併用する理由
- cache key、invalidation、staleTimeの意味
- 現時点でTanStack Queryを見送る理由
- network errorとHTTP errorの違い
- API DTOの変更をRepository境界で吸収し、内側の層を再利用する考え方

## うまくいったこと

- Repository契約を維持したままlocalStorage版からAPI版へ交換できた
- Domain、use case、編集用reducer、ViewModelを再利用できた
- API経由の一覧、追加、更新、削除を手動確認できた
- API停止時のエラーと、再起動後の再試行を手動確認できた
- 不正DTO、HTTP error、status不一致をテストできた
- stale responseとAbortSignalの経路をテストできた
- APIとFrontendのテスト、lint、buildが成功した

## 改善したいこと

- UIのエラーメッセージは現在一種類なので、network、HTTP、validation errorごとの案内を検討する
- APIのインメモリデータは再起動で消えるため、必要になればDatabaseを導入する
- `tsx watch`停止後に子Nodeプロセスが残る場合の終了方法を整理する
- 実データ量が増えた段階でpaginationやAPI側検索を検討する

## 次回の課題

- server error、field error、form errorを利用者の復旧操作に合わせて分ける
- フォーム送信中、成功、失敗時のアクセシビリティを改善する
- TanStack Queryは要件が増えた段階で再評価する
