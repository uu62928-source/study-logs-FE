# コーディング規約

## 基本

- TypeScriptのstrict設定を無効化して問題を回避しない
- `any`より`unknown`を使い、境界で絞り込む
- UIコンポーネントへ業務ルールや通信処理を直接書かない
- 共通化は2つ目の具体的な利用箇所が現れてから検討する
- exportは必要最小限にし、feature外から内部ファイルを直接importしない

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
