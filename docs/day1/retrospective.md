# 1日目 振り返り

テーマ：アーキテクチャ設計と境界づけ

関連資料：[ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [学習ノート](./learning-notes.md)

## 今日学んだこと

詳しい説明と判断基準は[1日目の学習ノート](./learning-notes.md)にまとめた。

### 1. 変更理由でコードをまとめる

変更理由でコードがまとまっていると、仕様変更の影響範囲と修正箇所が分かりやすい。例えば項目を追加するときは、型、データ取得、画面表示などの関連コードが`features/study-log`にまとまっているため、必要な変更を追いやすい。

### 2. `features`と`shared`を分ける

`features`には、ユーザーが利用する機能単位のコードを置く。`shared`には、特定の機能に依存せず、複数機能で実際に共通利用するものを置く。

将来使うかもしれないという理由だけでは`shared`へ移さず、具体的な再利用箇所が現れてから共有化を検討する。

### 3. 依存方向を一方向にする

依存方向を一方向にすると、循環参照を防ぎ、変更の影響がどこへ広がるか予測しやすくなる。

```text
app → features → shared
```

`shared`が`features`へ依存すると、特定機能の変更が共通部分や別機能へ波及し、単独でのテストや再利用も難しくなる。

### 4. 厳格なTypeScript設定で実行前に問題を見つける

`noUncheckedIndexedAccess`を有効にすると、配列や辞書へアクセスした結果に`undefined`の可能性が追加される。
そのため、値が`undefined`ではないことを確認せずに使用すると、型エラーになる。

```ts
const firstLog = studyLogs[0]
// StudyLog | undefined
```

存在確認をしていないコードを型チェックで検出できるため、実行時エラーになる前に対処できる。

### 5. 必要になるまで階層を増やさない

現在は外部API通信がないため、`api`フォルダを作っても役割がない。必要になる前に階層を作ると、用途が曖昧なコードや不要な抽象化が増えるため、実際に必要になった時点で追加する。

### 6. Clean Architectureについて

#### 6-1. Clean Architectureの層を変更理由で使い分ける

Clean Architectureは、重要な業務ルールをReactや保存技術から分離し、外側の層から内側の層へ依存させる設計である。

```text
UI・Infrastructure → Application → Domain
```

この矢印は処理やデータの流れではなく、コード上の依存方向を表している。

- `UI`：表示、ユーザー操作、loading・success・errorなどの画面状態を扱う
- `Application`：Repositoryの契約を介してデータを取得し、Domainのルールを使って結果を返すなど、ユースケースの流れを組み立てる
- `Domain`：学習ログの型、合計計算、学習時間の制約などの業務ルールを扱う
- `Infrastructure`：メモリ、localStorage、APIなど、保存や通信の具体的な方法を扱う

保存先をメモリからlocalStorageへ変える場合は主にInfrastructureを変更し、学習時間の上限などの業務ルールを変える場合はDomainを変更する。このように変更理由で層を分けることで、技術的な変更が業務ルールやUIへ波及しにくくなる。

#### 6-2. Repositoryの契約をApplication側に置く

取得結果を利用するApplication側が、「学習ログを取得できること」という必要な契約を`StudyLogRepository`として定義する。Infrastructureは、その契約をメモリやAPIなどの具体的な方法で実装する。

ApplicationがInfrastructureの都合に合わせるのではなく、InfrastructureがApplicationの要求に合わせることで、ユースケースを保存技術から分離できる。これが依存性逆転であり、保存方法の差し替えやApplicationのテストをしやすくする。

## 今日の設計判断

1. 学習ログに関するコードは、ファイル形式ではなく変更理由に合わせて`features/study-log`へまとめる。
2. 依存方向は`app → features → shared`に限定し、循環参照と変更の波及を防ぐ。
3. `shared`や外部API用の階層は先回りして作らず、具体的な利用箇所が現れてから追加する。
4. Clean Architectureを採用し、保存先やUIの変更が業務ルールやユースケースへ波及しにくい構造にする。

## 採用した方針

- feature単位でUI、Application、Domain、Infrastructureを近くに配置する
- feature外部からは公開用の`index.ts`を使い、feature内部では対象ファイルを直接importする
- TypeScriptの厳格な設定を使い、実行時に起こり得る問題を型チェックで見つける
- RepositoryのinterfaceをApplication側に置き、具体的な保存方法からユースケースを分離する

## 見送った方針と理由

- 将来の再利用を予想して`shared`へ移すこと：利用箇所と共通の意味がまだ確定していないため
- 外部API用の階層を先に作ること：現在は外部通信がなく、責務のない階層になるため
- feature同士を直接依存させること：変更が連鎖し、機能を独立して扱いにくくなるため

## 明日確認したいこと

- Domain型、DTO、ViewModel、form modelは何が違い、どの境界で変換するのか
- propsのoptional項目が増えた場合に、discriminated unionでどう不正な状態を防ぐのか
