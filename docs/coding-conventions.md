# コーディング規約

## 基本

- TypeScriptのstrict設定を無効化して問題を回避しない
- `any`より`unknown`を使い、境界で絞り込む
- UIコンポーネントへ業務ルールや通信処理を直接書かない
- 共通化は2つ目の具体的な利用箇所が現れてから検討する
- exportは必要最小限にし、feature外から内部ファイルを直接importしない

## featureのimport規約

### feature外部から使う場合

feature直下の`index.ts`を公開入口として使う。`ui`、`domain`、`model`などの内部ファイルを直接importしない。

```ts
// Good: 公開入口からimportする
import { StudyLogPage } from '@/features/study-log'

// Bad: featureの内部構造へ直接依存する
import { StudyLogPage } from '@/features/study-log/ui/StudyLogPage'
```

### 同じfeature内部で使う場合

公開入口の`index.ts`へ戻らず、相対パスで対象ファイルを直接importする。

```ts
// Good: feature内部の依存を直接表現する
import { calculateTotalMinutes } from '../domain/calculateTotalMinutes'

// Bad: 自分自身の公開入口を経由し、循環依存を作る可能性がある
import { calculateTotalMinutes } from '@/features/study-log'
```

`index.ts`は外部向けの再exportだけを担当し、初期化処理や業務ロジックを置かない。

```text
feature外部 → feature/index.ts → feature内部
```

- feature内部から自分自身の`index.ts`をimportしない
- feature同士を直接importしない。複数featureの組み合わせは`app`で行う
- `index.ts`をすべての階層へ作らず、featureの公開境界にだけ作る
- 新しいexportを追加するときは、本当にfeature外部へ公開する必要があるか確認する

## 命名

- Reactコンポーネントと型: `PascalCase`
- 関数、変数、hook: `camelCase`
- custom hook: `use`で始める
- boolean: `is`、`has`、`can`など状態が伝わる接頭辞を使う
- テスト: 実装方法ではなく観測可能な振る舞いを書く

## 完了条件

変更後に次をすべて通す。

```sh
npm run format:check
npm run lint
npm run test
npm run build
```
