# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/s-41/mybatis-bridge/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/s-41/mybatis-bridge/releases/tag/v0.0.1
