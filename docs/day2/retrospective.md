# 2日目 振り返り

テーマ：型モデリングとコンポーネントAPI設計

関連資料：[ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [学習ノート](./learning-notes.md)

## 今日学んだこと

- Domain型、Form型、ViewModelは、同じ学習ログでも用途と許容する状態が異なる
- branded typeを使うと、構造が同じ値を意味の違いで区別できる
- 生成関数を境界にすると、検証済みの値だけをDomain型として扱える
- discriminated unionを使うと、UI状態やpropsの不正な組み合わせを型で防げる
- Applicationの成功とUI上の状態は同じではなく、UI層で`empty`や`success`へ変換する必要がある
- 実行時の値はテスト、コード上の不正な組み合わせは型テストで検証する

## 実装したもの

- 学習ログが0件の場合の`empty`表示
- 学習ログの一覧、詳細、フィルタ、編集フォーム
- 入力値の検証、フィールド別エラー、保存中、保存失敗の表示
- `StudyLogId`と`StudyDurationMinutes`のbranded type
- Form型からDomain型へ変換する`toStudyLog`
- Domain型から表示用ViewModelへ変換する`toStudyLogSummaryViewModel`
- 読み取りと書き込みを分けたRepositoryの契約
- 学習ログ更新ユースケースと、インメモリRepositoryの更新処理
- Domain、Form、Application、Infrastructure、UIのテスト
- `@ts-expect-error`を使ったbranded type、UI状態、propsの型テスト

## 採用した型設計

### Domain型と生成関数

`StudyLogId`と`StudyDurationMinutes`をbranded typeにし、普通の`string`や`number`と区別した。`createStudyLog`で正規化と検証を行い、検証に成功した値だけへbrandを付ける。

これにより、`StudyLog`を受け取る処理では、ID、学習内容、学習時間がDomainのルールを満たしている前提で扱える。

### Form型と変換結果

入力途中の値は`StudyLogFormValues`として文字列のまま保持し、保存時に`toStudyLog`でDomain型へ変換する。

変換結果は`ok`を判別キーにしたunionとした。

```ts
type StudyLogFormResult =
  { ok: true; studyLog: StudyLog } | { ok: false; errors: StudyLogFormErrors }
```

成功時だけ`studyLog`、失敗時だけ`errors`を参照できるため、検証失敗を無視して保存することを防げる。

### ViewModelとUI状態

Domainの`durationMinutes: number`を、ViewModelで`durationLabel: string`へ変換した。表示形式の知識をDomainから分離し、UIは完成した表示用文字列を描画するだけにした。

UI状態は`loading`、`empty`、`success`、`error`のdiscriminated unionで表現した。複数のbooleanやoptional propsを組み合わせず、同時に成立してはいけない状態を作れないようにした。

### コンポーネントprops

`StudyLogView`のpropsも`status`を判別キーにしたunionとした。

```text
loading / empty / error → 保存処理を受け取らない
success                 → summaryと保存処理が必須
```

画面に編集機能が存在する`success`状態だけ、`onSaveStudyLog`を要求するAPIにした。

### Repositoryの契約

取得ユースケースは`StudyLogReader`、更新ユースケースは`StudyLogWriter`へ依存させた。各ユースケースが必要な操作だけを知る、小さな契約にした。

## 見送った案と理由

- API DTO：外部APIがまだ存在せず、通信形式との変換境界がないため
- genericsの導入：複数の型で共通化すべき処理がまだなく、具体的な型のほうが意図を読みやすいため
- `as const`の追加：リテラル型を保持する必要がある具体的な値がまだないため
- feature専用部品の`shared`化：別featureでの再利用実績がなく、公開APIを先に固定することになるため
- フィルタ処理の`useMemo`：現在の配列と計算が小さく、メモ化による複雑さに見合う性能上の根拠がないため
- UI状態を複数のbooleanやoptional propsで表すこと：矛盾した状態を作れるため
- すべてのコンポーネントをContainerとPresentationalへ分割すること：役割を一文で説明できない分割は、ファイル移動の負担だけを増やすため

## 型で防げるようになった問題

- 普通の`string`を検証せず`StudyLogId`として扱うこと
- 普通の`number`を検証せず`StudyDurationMinutes`として扱うこと
- `success`なのに表示用の`summary`が存在しない状態
- `error`なのにメッセージが存在しない状態
- `loading`にエラーメッセージを持たせること
- `success`なのに保存処理がない`StudyLogView`のprops
- `loading`、`empty`、`error`へ不要な保存処理を渡すこと
- Form型の検証に失敗しているのにDomain型として保存すること

## 理解に時間がかかったこと

### branded typeと生成関数

brandは実行時に値へ追加されるものではなく、TypeScript上だけの名札である点に時間がかかった。

`createStudyLog`の入力は普通の`string`と`number`であり、関数内で値を検証してからbrandを付け、検証済みの`StudyLog`を返す。型アサーションは検証の代わりではないため、生成関数の内部だけに限定する。

### ApplicationとUIの境界

Applicationにとって0件取得は成功だが、UIでは一覧を表示する`success`と、最初の記録を促す`empty`で意味が異なる。`useStudyLogSummary`がApplicationの結果をUI状態とViewModelへ変換する境界だと整理した。

### propsのdiscriminated union

状態を`state`プロパティへ入れ、保存処理を常に別propsとして渡すと、`loading`でも保存処理が必要になる。`status`をprops自身の判別キーにして、`success`の場合だけ保存処理を要求することで、状態と操作を一致させられた。

### 型テスト

`@ts-expect-error`は型エラーを単に無視するものではなく、「次の行は型エラーになるはず」と宣言する。制約が弱くなって型エラーが消えた場合にもbuildが失敗するため、型による防御を検証できる。

## 理解確認の結果

13問の確認を通して、次の内容は自分の言葉で説明できた。

- Domain型、Form型、ViewModelの役割とDTOをまだ作らない理由
- branded typeの目的と生成関数を通す流れ
- discriminated unionで不正状態を防ぐ理由
- `StudyLogPage`と`StudyLogView`の責務
- Applicationの取得成功をUIの`empty`へ変換する理由
- Form変換結果を成功・失敗のunionにする理由
- Repositoryの取得契約と保存契約を分ける理由
- 型テストと実行時テストの役割
- 境界値テストとbranded typeの役割の違い
- 編集フォームから保存、再取得、再表示までの流れ

次の内容は、回答後の訂正・補足によって理解を更新した。

### FormErrorsのoptional property

エラーをoptionalにする理由は、フォームが入力途中だからではない。各フィールドにエラーがあるかどうかが独立しており、エラーなし、片方だけ、両方という組み合わせがすべて正しいためである。

入力途中の値を許容する責務は`StudyLogFormValues`が持つ。

### Composition Root

`configureStudyLog`は、具体的なRepositoryを生成し、取得・更新ユースケースへ渡して組み合わせるComposition Rootである。

Applicationは具体的な保存実装を選ばず、Composition Rootが実装の選択と配線を担当する。

## 今日、説明できるようになったこと

- [x] Domain型、Form型、DTO、ViewModelの違いと変換場所
- [x] discriminated unionで不正なUI状態を防ぐ方法
- [x] ContainerとPresentationalを分ける判断基準
- [x] 再利用部品と機能専用部品を分ける判断基準
- [x] branded typeを使う目的と生成関数の役割
- [x] 型テストと実行時テストの使い分け
- [x] Repositoryの小さな契約とComposition Rootの役割
- [ ] `satisfies`、`as const`、genericsの使い分け
- [x] variantで不正なpropsの組み合わせを防ぐ方法

## 3日目に確認したいこと

- `StudyLogView`が持つフィルタ、選択、編集状態を、`useState`と`useReducer`のどちらで扱うべきか
- client state、server state、form state、URL stateをどう分類するか
- フィルタ条件をURL search paramsへ同期する方法
- インメモリRepositoryをlocalStorage実装へ差し替え、副作用をInfrastructureへ閉じ込める方法
- 保存の楽観的更新、失敗時のロールバック、競合をどう表現するか
- `satisfies`、`as const`、genericsを使う具体的な必要性が現れた場合の判断基準
- 複数箇所で本当に共通利用するvariant componentが現れた場合の公開API設計
- Form stateが複雑になった場合に、フィールド別エラーをどの状態へ持たせるか
- Composition RootからlocalStorage Repositoryへ差し替えた場合も、ApplicationとUIを変更せずに済むか実装で確認する
