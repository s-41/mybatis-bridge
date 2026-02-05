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

# テスト実行（VS Code環境が必要）
pnpm run test

# 本番用パッケージング
pnpm run package
```

### デバッグ実行
VS Codeでプロジェクトを開き、F5キーで拡張機能をデバッグ実行（Extension Development Host起動）。`.vscode/launch.json`に`Run Extension`と`Extension Tests`の構成あり。

## アーキテクチャ

### ビルドシステム
- **esbuild**: バンドラーとして使用（`esbuild.js`で設定）
- **TypeScript**: 型チェックのみ（`noEmit: true`）、実際のトランスパイルはesbuildが担当
- `vscode`モジュールはexternalとして扱い、バンドルに含めない
- エントリーポイント: `src/extension.ts` → `dist/extension.js`

### コア機能の仕組み

#### 双方向ジャンプ機能
VS Codeの`DefinitionProvider` APIを使用し、"Go to Definition"（Ctrl/Cmd+Click または F12）でジャンプ可能。

- **Java → XML**: `JavaToXmlDefinitionProvider` - Mapperインターフェースのメソッド名からXMLのstatement（select/insert/update/delete/resultMap）へジャンプ
- **XML → Java**: `XmlToJavaDefinitionProvider` - XMLのstatement id属性値からJavaのメソッド定義へジャンプ

#### CodeLensナビゲーション
`CodeLensProvider` APIを使用し、コード上にジャンプリンクを表示。

- **JavaToXmlCodeLensProvider**: Javaのメソッド上に「Go to Mapper XML」リンクを表示
- **XmlToJavaCodeLensProvider**: XMLのstatement上に「Go to Mapper Interface」リンクを表示
- **MapperUsageCodeLensProvider**: ServiceクラスなどでMapperを呼び出している箇所に「Go to Mapper XML」リンクを表示
- `mybatis-bridge.enableCodeLens`設定で有効/無効を切り替え可能（デフォルト: 有効）
- `mybatis-bridge.enableMapperUsageCodeLens`設定でMapper呼び出し箇所のCodeLensを有効/無効に切り替え可能（デフォルト: 有効）

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
- `MapperUsageParser`: import文解析、Mapperフィールド抽出、メソッド呼び出し検出

### 国際化（i18n）
`l10n/`ディレクトリにローカライズファイルを配置。`package.nls.json`（英語）と`package.nls.ja.json`（日本語）でUI文字列を管理。package.jsonでは`%key%`形式で参照
