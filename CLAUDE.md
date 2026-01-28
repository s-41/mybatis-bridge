# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

MyBatis Bridge - MyBatis用のVS Code拡張機能。現在は初期段階で、基本的なHello Worldコマンドのみ実装されている。

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# ビルド（型チェック + lint + esbuild）
pnpm run compile

# 開発時のウォッチモード（型チェックとesbuildを並列実行）
pnpm run watch

# 型チェックのみ
pnpm run check-types

# Lint
pnpm run lint
pnpm run lint:fix

# テスト実行
pnpm run test

# 本番用パッケージング
pnpm run package
```

## アーキテクチャ

### ビルドシステム
- **esbuild**: バンドラーとして使用（`esbuild.js`で設定）
- **TypeScript**: 型チェックのみ（`noEmit: true`）、実際のトランスパイルはesbuildが担当
- `vscode`モジュールはexternalとして扱い、バンドルに含めない

### エントリーポイント
- `src/extension.ts` → `dist/extension.js`にバンドル

### VS Code拡張機能の開発
- VS Codeでプロジェクトを開き、F5キーで拡張機能をデバッグ実行（Extension Development Host起動）
- `Run Extension`構成で拡張機能をテスト
- `Extension Tests`構成でテストを実行

## 技術スタック

- Node.js 20+
- pnpm 9.x
- VS Code 1.96.0+
- TypeScript 5.x
- ESLint 9.x（Flat Config形式）
