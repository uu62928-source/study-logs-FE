# Study Logs FE

ReactとTypeScriptの設計を学ぶための、学習ログアプリです。

小さな題材を使いながら、Feature-based ArchitectureとClean Architectureの境界、依存方向、テストしやすい実装を検証しています。

## 現在の機能

- 学習ログの一覧表示
- 学習時間の合計表示
- Repositoryを介したデータ取得
- Domain、Application、Infrastructure、UIの分離

## 技術スタック

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- ESLint
- Prettier

## セットアップ

```bash
npm install
npm run dev
```

## コマンド

```bash
npm run test
npm run lint
npm run build
npm run format:check
```

## ディレクトリ構成

```text
src/
├─ app/                  # アプリ全体の組み立て
├─ features/study-log/
│  ├─ application/      # ユースケースと外部境界
│  ├─ domain/           # 業務ルール
│  ├─ infrastructure/   # Repositoryの実装
│  └─ ui/               # 表示とUI状態
├─ shared/              # 機能に依存しない共通基盤
└─ test/                # テスト共通設定
```

## 設計ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [コーディング規約](docs/coding-conventions.md)
- [学習ノート](docs/learning-notes.md)

## プロジェクトの位置づけ

学習用に作成するプログラム。
機能よりも、変更理由に沿った責務分離と依存方向の学習など学習面を重視しています。
