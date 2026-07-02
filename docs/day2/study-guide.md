# 2日目 学習ガイド

テーマ：型モデリングとコンポーネントAPI設計

関連資料：[ドキュメント案内](./README.md) / [学習ノート](./learning-notes.md) / [振り返り](./retrospective.md) / [カリキュラム](../../react-typescript-ai-coding-curriculum.md)

## 今日のゴール

TypeScriptの型で仕様とUI状態を表現し、不正な値やpropsの組み合わせをコンパイル時に防げるようになる。

さらに、Domain型、Form型、API DTO、ViewModelの役割を区別し、どの境界で変換するか説明できるようになる。

## 達成目標

### 1. 用途ごとの型を分ける

同じ学習ログを扱っていても、層ごとに必要な情報と制約は異なる。

- `Domain型`: 業務上正しい学習ログを表す
- `Form型`: 入力途中や未入力を含む、フォーム上の値を表す
- `DTO`: APIや保存先との通信形式を表す
- `ViewModel`: 画面にそのまま表示できる文字列や状態を表す

1つの巨大な型を全層で使い回さず、境界で明示的に変換する。これにより、保存形式や表示形式の変更がDomainへ直接波及することを防ぐ。

```text
Form型 → Domain型 → DTO
           ↓
       ViewModel → UI
```

### 2. discriminated unionでUI状態を表現する

`loading`、`success`、`empty`、`error`を複数のbooleanやoptionalな値で表すと、矛盾した状態を作れてしまう。

```ts
type StudyLogViewState =
  | { status: 'loading' }
  | { status: 'success'; logs: StudyLogViewModel[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }
```

判別用の`status`と、その状態でだけ必要な値を組み合わせる。不正な状態を型として表現できない設計を目指す。

### 3. optional propsの増殖をvariantへ置き換える

用途の違いをoptional propsで表すと、無効な組み合わせや条件分岐が増える。見た目や振る舞いが明確に異なる場合は、discriminated unionを使ってvariantごとのpropsを定義する。

```ts
type ActionProps =
  { variant: 'button'; onClick: () => void } | { variant: 'link'; href: string }
```

`variant: 'button'`と`href`のような不正な組み合わせを型エラーにできることを確認する。

### 4. コンポーネントの責務を分ける

- Container: データ取得、状態管理、ユースケースの呼び出しを担当する
- Presentational: propsを受け取り、表示とユーザー操作の通知を担当する

すべてのコンポーネントを機械的に2分割するのではなく、データ取得と表示が複雑になった場所で分ける。機能固有の部品は`features/study-log`内に置き、複数機能で実際に再利用する業務知識のない部品だけを`shared`の候補にする。

### 5. TypeScriptの型機能を目的に合わせて使う

- `as const`: リテラル値を広い`string`や`number`に拡大させない
- `satisfies`: 値の具体的な型を保ちながら、必要な契約を満たすか検査する
- generics: 型が違っても同じ関係や処理を持つ場合に使う
- branded type: 構造が同じ値を意味の違いで区別する

```ts
type StudyLogId = string & { readonly __brand: 'StudyLogId' }
```

高度な型を使うこと自体を目的にしない。実際に混同すると不具合になるIDや単位など、型で区別する価値がある場所へ限定する。

### 6. コンポーネントの公開APIを小さく保つ

コンポーネントへDomainオブジェクト全体を渡すのではなく、表示に必要な値と操作だけをpropsとして公開する。呼び出し側が内部実装を知る必要のないAPIにする。

propsを設計するときは次を確認する。

- そのpropsは本当に呼び出し側が決めるものか
- booleanやoptional propsの組み合わせに矛盾がないか
- イベント名が実装方法ではなく、ユーザーの意図を表しているか
- 機能専用の部品を早すぎる段階で共通化していないか

## 今日、説明・実演できれば合格

1. Domain型、Form型、DTO、ViewModelの違いと変換場所
2. booleanとoptional propsの組み合わせが作る不正状態
3. discriminated unionで不正なUI状態を防ぐ方法
4. ContainerとPresentationalを分ける判断基準
5. 再利用部品と機能専用部品を分ける判断基準
6. `satisfies`と型注釈、`as const`の違い
7. branded typeやgenericsを採用する場合と見送る場合
8. 一覧、詳細、編集フォーム、フィルタ、空状態、エラー状態を型安全に扱えること
9. variantを持つコンポーネントで、不正なpropsの組み合わせが型エラーになること

## 7.5時間の進め方

1. 45分: 1日目の成果を動かし、型やpropsに関する課題を洗い出す
2. 90分: Domain型、Form型、DTO、ViewModel、コンポーネントpropsの境界を設計する
3. 180分: 一覧、詳細、編集フォーム、フィルタ、状態別UIを実装する
4. 45分: 不正な状態と境界値を型エラーやテストで確認する
5. 60分: Codexへ型とコンポーネントAPIのレビューを依頼し、過剰な型やpropsを整理する
6. 30分: 採用した型設計、見送った案、3日目へ持ち越す課題を記録する

## 実装前のチェックリスト

- [ ] 今日追加する画面と操作を言葉で説明できる
- [ ] UI状態の全パターンを列挙した
- [ ] 各型がどの層に属するか決めた
- [ ] 型の変換場所を決めた
- [ ] コンポーネントの公開propsを書き出した
- [ ] 型で防ぎたい不正な値や組み合わせを決めた

## 完了時のチェックリスト

- [ ] 一覧、詳細、編集フォーム、フィルタが動作する
- [ ] loading、success、empty、errorの各状態を確認できる
- [ ] variantを持つコンポーネントを1つ実装した
- [ ] 不正なpropsの組み合わせが型エラーになる
- [ ] Domain型、Form型、DTO、ViewModelを必要に応じて分離した
- [ ] `npm run lint`、`npm run test`、`npm run build`が成功する
- [ ] 採用・見送りの理由を振り返りへ記録した
