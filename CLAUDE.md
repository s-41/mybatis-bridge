# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

MyBatis Bridge - MyBatis用のVS Code拡張機能。JavaのMapperインターフェースとMyBatis XMLファイル間の双方向ジャンプ機能を提供する。

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

### コア機能の仕組み

#### 双方向ジャンプ機能
VS Codeの`DefinitionProvider` APIを使用し、"Go to Definition"（Ctrl/Cmd+Click または F12）でジャンプ可能。

- **Java → XML**: `JavaToXmlDefinitionProvider` - Mapperインターフェースのメソッド名からXMLのstatement（select/insert/update/delete/resultMap）へジャンプ
- **XML → Java**: `XmlToJavaDefinitionProvider` - XMLのstatement id属性値からJavaのメソッド定義へジャンプ

#### MapperIndexService（シングルトン）
ワークスペース内のMapperファイルをインデックス化し、高速な検索を実現。

- **遅延初期化**: 初回のジャンプ操作時にスキャン開始
- **4つのインデックス**: namespace→XML、URI→XML、FQN→Java、URI→Java
- **FileSystemWatcher**: ファイルの作成/変更/削除を監視して自動更新
- **設定可能なglobパターン**: `mybatis-bridge.xmlMapperPatterns`、`mybatis-bridge.javaMapperPatterns`

#### パーサー（正規表現ベース）
AST不要の軽量パーサーで高速処理。

- `XmlMapperParser`: namespace抽出、statement（id属性）抽出、MyBatis XML判定
- `JavaMapperParser`: package名、interface名、メソッド名の抽出

### ディレクトリ構成

```
src/
├── extension.ts          # エントリーポイント（activate/deactivate）
├── types/                # 型定義
│   └── mapper.ts         # XmlMapperInfo, JavaMapperInfo, StatementLocation等
├── providers/            # VS Code DefinitionProvider実装
│   ├── JavaToXmlDefinitionProvider.ts
│   └── XmlToJavaDefinitionProvider.ts
└── services/             # ビジネスロジック
    ├── MapperIndexService.ts  # インデックス管理（シングルトン）
    ├── XmlMapperParser.ts     # XMLパーサー
    └── JavaMapperParser.ts    # Javaパーサー
```

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
