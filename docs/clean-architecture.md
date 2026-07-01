# Clean Architecture解説

## 目的

Clean Architectureの目的は、フォルダを増やすことではない。重要な業務ルールを、React、API、データベースなど変更されやすい外部事情から守ることである。

中心となる原則は、依存を内側へ向けること。

```text
外側                                              内側

React UI ───────→ Application ───────→ Domain
Infrastructure ─→ ApplicationのPort ─→ Domain
        ↑
        └── configureStudyLogが組み立てる
```

内側の層は外側の層を知らない。

- DomainはReact、Repository、保存方法を知らない
- Applicationは具体的なInMemory実装を知らない
- InfrastructureはApplicationが定義した契約を実装する
- UIはユースケースを呼び出すが、データがどこに保存されているか知らない

## このプロジェクトでのレイヤー

```text
features/study-log/
├─ domain/
│  └─ studyLog.ts
├─ application/
│  ├─ ports/
│  │  └─ StudyLogRepository.ts
│  └─ use-cases/
│     └─ getStudyLogSummary.ts
├─ infrastructure/
│  └─ InMemoryStudyLogRepository.ts
├─ ui/
│  ├─ StudyLogPage.tsx
│  └─ useStudyLogSummary.ts
├─ configureStudyLog.ts
└─ index.ts
```

### Domain

アプリの中心となる概念と業務ルールを持つ。

現在は次を担当する。

- `StudyLog`の型
- 学習時間を合計する純粋関数

```ts
calculateTotalStudyMinutes(studyLogs)
```

Reactや非同期通信をimportしないため、単独で高速にテストできる。

### Application

ユーザーがアプリで達成する処理、つまりユースケースを表現する。

現在の`getStudyLogSummary`は次を行う。

1. Repositoryから学習ログを取得する
2. Domainの関数で合計時間を計算する
3. UIへ表示用の結果を返す

Applicationは「どのように保存するか」を決めない。必要な操作だけを`StudyLogRepository` interfaceとして定義する。

```ts
interface StudyLogRepository {
  findAll(): Promise<readonly StudyLog[]>
}
```

### Infrastructure

外部システムや具体的な技術との接続を担当する。

現在は`InMemoryStudyLogRepository`が、メモリ上の配列から学習ログを返す。将来APIやlocalStorageへ変更するときは、新しいRepository実装へ交換する。

```text
InMemoryStudyLogRepository
          ↓ 将来交換
ApiStudyLogRepository
LocalStorageStudyLogRepository
```

Applicationはinterfaceだけを知っているため、保存方法を交換してもユースケースを変更する必要がない。

### UI

Reactによる表示とユーザー操作を担当する。

- loading、success、errorを表示する
- ユースケースを呼び出す
- 取得結果を画面へ描画する

UIは`InMemoryStudyLogRepository`を直接importしない。そのため、テストではユースケースを関数として差し替えられる。

### Composition Root

`configureStudyLog.ts`は、具体的なRepositoryとユースケースを組み立てる。

```ts
const repository = new InMemoryStudyLogRepository(initialStudyLogs)
const getStudyLogSummary = createGetStudyLogSummary(repository)
```

この「具体的な部品を知ってよい場所」を限定することで、ApplicationやUIへ生成処理が散らばるのを防ぐ。

## 依存性逆転

普通に考えると、Applicationが具体的なデータ取得処理をimportしたくなる。

```text
Application → InMemoryRepository
```

これでは保存方法を変更するたびにApplicationも変更される。

Clean Architectureでは、Applicationが必要な契約を定義し、Infrastructureがその契約を実装する。

```text
Application ← Infrastructure
     │
     └─ StudyLogRepositoryという契約を所有する
```

ソースコードのimportを見ると、InfrastructureからApplicationへ依存している。処理を呼び出す向きと、ソースコードが依存する向きは同じとは限らない。

## テストしやすくなる理由

各層を境界で置き換えられる。

- Domainテスト：配列を渡して計算結果だけを確認する
- Applicationテスト：Repositoryの偽物を渡してユースケースを確認する
- UIテスト：ユースケース関数を渡して表示を確認する
- Infrastructureテスト：保存技術との接続だけを確認する

テストは層の内部実装ではなく、境界から観測できる振る舞いを検証する。

## トレードオフ

今回の規模では、Clean Architectureによってファイル数とinterfaceが増えた。保存方法が一つで今後も変わらないなら、分離コストの方が高い可能性もある。

採用価値が高くなるのは、次のような場合である。

- 業務ルールが複雑になる
- APIやlocalStorageなど外部境界がある
- 保存方法を交換する可能性がある
- UI以外から同じユースケースを使う
- 層ごとに独立してテストしたい

重要なのは、すべてのfeatureへ空の`domain`や`application`を作ることではない。具体的な業務ルールや外部境界が現れたfeatureに、必要な層だけを追加する。
