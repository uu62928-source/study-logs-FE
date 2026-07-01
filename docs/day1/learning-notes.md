# 1日目 学習ノート

テーマ：アーキテクチャ設計と境界づけ

関連資料：[学習ガイド](./study-guide.md) / [振り返り](./retrospective.md)

---

## ファイル形式ではなく変更理由で責務を分ける

### 何が分かりにくかったか

コンポーネントは`components`、hookは`hooks`、型は`types`へ置くような、ファイルの技術的な種類による分類との違いが曖昧だった。

### 解説

「変更理由で分ける」とは、同じ目的の変更で一緒に修正するコードを近くへ置くことである。

学習ログの画面、状態管理、型、計算処理はファイル形式が異なる。しかし、どれも「学習ログ機能の仕様変更」によって変わるため、`features/study-log`の中へまとめる。

```text
features/
└─ study-log/
   ├─ ui/
   ├─ model/
   ├─ domain/
   └─ api/
```

一方、アプリ全体のボタンデザインは学習ログの仕様ではなく、アプリ共通のUI方針によって変わる。そのため、必要になれば`shared/ui`へ置く。

### 判断ルール

配置先に迷ったら、次の質問をする。

> このコードは、どの要求や仕様が変わったときに変更されるか？

- 学習ログの仕様で変わる：`features/study-log`
- アプリ全体の構成で変わる：`app`
- 複数機能で使う業務知識のない基盤として変わる：`shared`

---

## `app`、`features`、`shared`の役割

### 何が分かりにくかったか

3つのディレクトリがそれぞれ何を所有し、どの方向へ依存してよいのかが曖昧だった。

### 解説

```text
main.tsx → app → features → shared
```

#### `app`

アプリケーション全体を組み立てる。

- ルーティング
- Provider
- 複数featureの配置と組み合わせ
- アプリ全体のスタイル
- アプリ全体のエラー処理

個別機能の業務ルールは持たない。

#### `features`

ユーザーが利用する機能を実現する。

- 機能固有のUI
- UI状態と状態遷移
- ドメイン型と業務ルール
- 機能固有のAPI処理

現在の`study-log`は、学習ログという一つのユーザー機能を所有する。

#### `shared`

特定のfeatureに依存しない共通基盤を置く。

- 汎用UI
- 汎用関数
- HTTPクライアント
- 複数機能で共有する基礎的な型

「将来使いそう」という理由だけでは置かず、具体的な再利用箇所が現れてから共有を検討する。

### 判断ルール

- `app`：機能を組み立てる
- `features`：ユーザー機能を実現する
- `shared`：機能に依存しない共通基盤を提供する
- `features → app`と`shared → features`の依存は作らない

---

## featureのCSSを`app`へ置くと暗黙の依存になる

### 何が分かりにくかったか

`app/styles.css`のクラスをfeatureのコンポーネントから使うことが、なぜ依存関係の問題になるのかが曖昧だった。

### 解説

以前の`StudyLogPage.tsx`は、`page`や`card`というクラスを使用していたが、その定義は`app/styles.css`にあった。

```text
StudyLogPage.tsx ──暗黙──→ app/styles.css
```

TypeScriptのimportには現れないが、featureの表示には`app`内のCSSが必要だった。これではfeatureを単独で表示した際に、必要なスタイルが分からない。

現在は、画面固有のCSSをコンポーネントと同じfeatureへ置いている。

```text
features/study-log/ui/
├─ StudyLogPage.tsx
└─ StudyLogPage.css
```

```ts
import './StudyLogPage.css'
```

これにより、コンポーネントが必要とするスタイルがimportとして明示された。

### 判断ルール

- リセットや`body`など全体設定：`app/styles.css`
- feature固有の見た目：対象featureの近く
- 複数機能で実際に共有するUI：`shared/ui`を検討

---

## featureの公開用`index.ts`と循環依存

### 何が分かりにくかったか

なぜfeature内部から公開用`index.ts`を使うと循環依存になり得るのか、また`index.ts`を誰が使うのかが曖昧だった。

### 解説

feature直下の`index.ts`は、feature外部へ公開してよいものを示す窓口である。

```ts
// features/study-log/index.ts
export { StudyLogPage } from './ui/StudyLogPage'
```

feature外部の`app`は、この公開窓口を使う。

```ts
import { StudyLogPage } from '@/features/study-log'
```

現在の依存は一方向である。

```text
App.tsx → index.ts → StudyLogPage.tsx
```

一方、`StudyLogPage.tsx`が同じfeatureの公開窓口から別の関数をimportすると、依存が一周する可能性がある。

```text
index.ts → StudyLogPage.tsx → index.ts
```

そのため、同じfeature内部では対象ファイルを相対パスで直接importする。

```ts
// Good: feature内部
import { calculateTotalMinutes } from '../domain/calculateTotalMinutes'

// Bad: 自分自身の公開窓口へ戻る
import { calculateTotalMinutes } from '@/features/study-log'
```

### 判断ルール

```text
feature外部 → featureのindex.tsを使う
feature内部 → 相対パスで内部ファイルを直接使う
```

`index.ts`は外から入るための玄関であり、家の中で部屋を移動するときに毎回玄関へ戻る必要はない。

---

## feature同士を直接依存させない理由

### 何が分かりにくかったか

featureの`index.ts`は`app`などの上位層が使うものであり、別featureから使うものではない、という理解が正しいか確認が必要だった。

### 解説

基本的にはその理解で正しい。

```text
app
├─→ study-log
└─→ study-goal
```

複数featureを一つの画面で使う場合は、上位層である`app`が組み合わせる。

```tsx
import { StudyGoal } from '@/features/study-goal'
import { StudyLogPage } from '@/features/study-log'

export function App() {
  return (
    <>
      <StudyGoal />
      <StudyLogPage />
    </>
  )
}
```

feature同士を直接依存させると、一方の変更がもう一方へ連鎖し、独立して変更しにくくなる。

ただし、これは機械的な絶対法則ではない。二つのfeatureが常に一体でなければ成立しない場合は、次を検討する。

1. 実際には一つのfeatureではないか
2. 共通部分を`shared`へ置くべきか
3. `app`などの上位層で組み合わせられないか

### 判断ルール

- feature同士は原則として直接importしない
- 複数featureの組み合わせは`app`などの上位層が担当する
- 強い相互依存が必要なら、featureの境界自体を見直す

---

## チーム開発で安全に`shared`へ移動する

### 何が分かりにくかったか

具体的な再利用箇所が現れてから`shared`へ移す方針では、誰かが突然ファイルを移動し、並行作業中の開発者が追随しづらくなる懸念があった。

### 解説

「必要になるまで共有しない」は、各開発者が自由なタイミングで移動してよいという意味ではない。チームでは、共有化の条件と移行手順を決める必要がある。

#### 共有化の条件を明文化する

次をすべて満たした場合に`shared`への移動を検討する。

1. 具体的な利用箇所が複数ある
2. 利用側で意味と振る舞いが同じである
3. 特定featureの業務知識を持たない
4. 公開APIと責任を短く説明できる
5. 共有によって利用側が不自然なオプションだらけにならない

単にコードの形が似ているだけなら、重複を残す方が安全な場合もある。

#### 移動を利用側の変更と同時に行う

共有部品を必要とする変更のPRで、次を一緒に行う。

```text
1. sharedへ抽出する
2. 既存利用箇所のimportを更新する
3. 新しい利用箇所から使う
4. テストを通す
```

リポジトリ内の参照を一つのPRで更新すれば、mainブランチには「移動途中」の状態が残らない。

#### 大きな移動は機能変更と分ける

多数のファイルやimportを変更する場合は、機能追加とリファクタリングを別PRにする。レビューしやすくなり、並行ブランチとの衝突原因も判断しやすい。

#### 必要なら互換用の再exportを一時的に残す

長期間作業しているブランチが複数ある場合は、元の場所から新しい場所を一時的に再exportできる。

```ts
// 古いパス。一時的な互換窓口
export { Button } from '@/shared/ui/Button'
```

これにより、古いimportはすぐには壊れない。ただし、削除予定をissueやコメントで明示し、移行完了後に消す。恒久的に残すと公開経路が複数になり、構造が分かりにくくなる。

#### PRで共有APIをレビューする

`shared`への追加では、コードだけでなく次を確認する。

- 名前は特定featureへ偏っていないか
- propsや引数は利用側の都合を詰め込みすぎていないか
- どの層から利用してよいか
- 破壊的変更がどこへ影響するか
- 本当に共有した方が変更しやすいか

規模が大きければ、`shared`の変更にレビュー担当者を設定する方法もある。ただし、小規模チームで厳格な承認フローを作ると遅くなるため、必要性が現れてから導入する。

#### 自動検査で依存方向を守る

チームが成長し、違反が実際に発生し始めたら、ESLintなどで次を検査する。

```text
shared ─×→ features
shared ─×→ app
feature ─×→ 別feature
```

最初から複雑な設定を導入するのではなく、口頭やレビューだけでは守れなくなった時点で自動化する。

### 判断ルール

- `shared`への移動は個人判断で突然行わず、PR上で意図を説明する
- 共有化のPRでは既存参照も同時に更新し、mainを常に動く状態に保つ
- 並行ブランチへの影響が大きい場合は、事前共有または一時的な再exportを使う
- 大規模な移動と機能変更を一つのPRへ詰め込まない
- 共有化による結合が、重複によるコストより本当に小さいか確認する

### 小規模チーム向けの最小ルール

このプロジェクト規模なら、まず次の3つで十分である。

1. `shared`へ追加・移動するPRには理由と利用箇所を書く
2. 移動時にリポジトリ内のimportを同じPRで更新する
3. 影響が大きい移動だけ、作業開始前にチームへ知らせる

---

## Clean Architectureについて

### 解説

Clean Architectureは、重要な業務ルールをReactや保存技術から分離し、依存を内側へ向ける設計である。

```text
UI・Infrastructure → Application → Domain
```

このプロジェクトでは、学習ログの合計計算をDomain、ログを取得して集計する処理をApplication、メモリから取得する具体的な方法をInfrastructure、表示をUIへ置いた。

特に重要なのは、RepositoryのinterfaceをApplicationが所有する点である。Applicationが必要な契約を決め、Infrastructureがその契約へ従う。これを依存性逆転という。

詳しいファイル対応と実装例は[Clean Architecture解説](../clean-architecture.md)を参照する。

### 判断ルール

- DomainへReact、API、localStorageなど外側の技術を持ち込まない
- Applicationは具体的なRepository実装ではなく、自分が定義したinterfaceへ依存する
- UIとInfrastructureはApplicationのユースケースやPortへ依存してよい
- 具体的な実装の組み立てはComposition Rootへ限定する
- 空のレイヤーを先に作らず、実際のルールや外部境界がある場合に追加する

---

## 現在の理解を確認するチェックリスト

- [ ] コードの配置を、ファイル形式ではなく変更理由から説明できる
- [ ] `app`、`features`、`shared`の責務を説明できる
- [ ] アプリ全体のCSSとfeature固有CSSを区別できる
- [ ] feature外部と内部でimport方法を使い分けられる
- [ ] feature同士を直接依存させない理由を説明できる
- [ ] チームで安全に`shared`へ移動する手順を説明できる
- [ ] Clean Architectureの依存方向と依存性逆転を説明できる
