# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-02-08

### Added

- コンテンツサニタイザーによるコメント・CDATA・文字列リテラル内の誤検出防止
- XMLの`<sql>`要素の検出に対応
- 複数行メソッドシグネチャの検出に対応（括弧の深さ追跡）
- 配列型戻り値（`User[]`, `byte[]`等）の検出に対応
- アノテーション付きinterface・抽象クラスMapperの検出に対応
- メソッドパラメータ経由のMapper呼び出し検出に対応
- 各パーサー・サニタイザーの単体テストを追加

### Fixed

- オーバーロードメソッドで最初の定義を優先するよう修正

## [0.1.1] - 2026-02-06

### Changed

- README.mdにCodeLens機能の説明を追加

## [0.1.0] - 2026-02-05

### Added

- **CodeLensナビゲーション機能** (#3)
  - Javaのメソッド上に「Go to Mapper XML」リンクを表示
  - XMLのstatement上に「Go to Mapper Interface」リンクを表示
  - `mybatis-bridge.enableCodeLens`設定で有効/無効を切り替え可能
- **Mapper呼び出し元からのXMLジャンプ機能** (#5)
  - ServiceクラスなどでMapperを呼び出している箇所に「Go to Mapper XML」リンクを表示
  - `mybatis-bridge.enableMapperUsageCodeLens`設定で有効/無効を切り替え可能

### Security

- 依存関係のセキュリティ脆弱性を修正 (#6)

## [0.0.1] - 2025-01-28

### Added

- Java MapperインターフェースからMyBatis XMLへのジャンプ機能
- MyBatis XMLからJava Mapperインターフェースへのジャンプ機能
- ワークスペース内のMapperファイルの自動インデックス化
- ファイル変更時の自動インデックス更新
- 国際化対応（英語・日本語）
- 設定可能なglobパターン
  - `mybatis-bridge.javaMapperPatterns`: Javaファイルの検索パターン
  - `mybatis-bridge.xmlMapperPatterns`: XMLファイルの検索パターン
- デフォルトのJavaパターン: `*Mapper.java`, `*Dao.java`, `*Repository.java`
- デフォルトのXMLパターン: `**/resources/**/*.xml`, `**/*Mapper.xml`
- `@Param`アノテーション付き引数を持つメソッドの検出対応
- 複数行にまたがるXMLタグ定義の検出対応

[Unreleased]: https://github.com/s-41/mybatis-bridge/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/s-41/mybatis-bridge/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/s-41/mybatis-bridge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/s-41/mybatis-bridge/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/s-41/mybatis-bridge/releases/tag/v0.0.1
