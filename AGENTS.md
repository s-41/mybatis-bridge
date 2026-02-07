# Repository Guidelines

このリポジトリは MyBatis 用の VS Code 拡張機能を扱います。開発は TypeScript を中心に行い、ビルドは esbuild、型検証と lint は tsc / ESLint に依存します。作業前に `pnpm install` を実行し、`dist/` の生成物は手動で編集しないでください。

## Project Structure & Module Organization

- `src/extension.ts`: 拡張機能のエントリーポイント。
- `src/providers/`: Definition/CodeLens などの Provider 実装。
- `src/services/`: インデックスや解析ロジックなどのサービス層。
- `src/utils/`, `src/types/`: 共通ユーティリティと型定義。
- `src/test/suite/`: Mocha ベースのテスト。
- `dist/`: esbuild による出力。
- `l10n/`, `package.nls*.json`: UI 文字列のローカライズ。
- `images/`, `samples/`: アイコン・サンプル資材。

## Build, Test, and Development Commands

- `pnpm install`: 依存関係のインストール。
- `pnpm run compile`: 型チェック + lint + esbuild。
- `pnpm run watch`: 監視モード（tsc/esbuild を並列実行）。
- `pnpm run check-types`: TypeScript の型チェックのみ。
- `pnpm run lint` / `pnpm run lint:fix`: ESLint 実行。
- `pnpm run test`: VS Code 環境で拡張機能テスト。
- `pnpm run package`: 公開向けバンドル作成。

## Coding Style & Naming Conventions

- 既存の TypeScript 実装に合わせる（インデントは 2 スペース相当）。
- 変数・関数は `camelCase`、クラスは `PascalCase`。
- 設定キーは `mybatis-bridge.*` に統一。
- フォーマットは ESLint に従い、必要に応じて `pnpm run lint:fix`。

## Testing Guidelines

- テストは `src/test/suite/*.test.ts` に配置。
- 解析ロジックや Provider 変更時は、該当テストの追加/更新を行う。
- 実行は `pnpm run test`（VS Code が必要）。

## Commit & Pull Request Guidelines

- ブランチ: `feat/…`, `fix/…`, `hotfix/…`, `docs/…`, `chore/…`。
- コミット形式: `<type>(<scope>): <subject>`（subject は「〜する」体）。
  - 例: `feat(parser): XML の抽出精度を改善する`
- main への直接コミット/ push は禁止。PR で変更を統合。
- PR タイトルは `[type] 概要`、本文に目的・変更概要・確認方法・Issue を記載。

## Security & Configuration Tips

- トークンや秘密情報をコミットしない。
- UI 文言は `l10n/` と `package.nls*.json` を更新する。
- 動作要件: Node.js 20+、VS Code 1.96+。
