# MyBatis Bridge

[English](#english) | [日本語](#日本語)

---

## English

A VS Code extension that enables bidirectional navigation between Java Mapper interfaces and MyBatis XML files.

### Features

- **Java → XML**: Jump from Mapper interface method names to corresponding XML statements (select/insert/update/delete/resultMap)
- **XML → Java**: Jump from XML statement id attributes to corresponding Java method definitions

### Usage

On a Mapper interface method name or XML statement id, use:

- `Ctrl+Click` (Mac: `Cmd+Click`)
- `F12` (Go to Definition)

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `mybatis-bridge.javaMapperPatterns` | Glob patterns to find Java Mapper files | `["**/*Mapper.java", "**/*Dao.java", "**/*Repository.java"]` |
| `mybatis-bridge.xmlMapperPatterns` | Glob patterns to find XML Mapper files | `["**/resources/**/*.xml", "**/*Mapper.xml"]` |

### Requirements

- VS Code 1.96.0 or later

### License

MIT

---

## 日本語

JavaのMapperインターフェースとMyBatis XMLファイル間の双方向ジャンプを実現するVS Code拡張機能。

### 機能

- **Java → XML**: Mapperインターフェースのメソッド名から、対応するXMLのstatement（select/insert/update/delete/resultMap）へジャンプ
- **XML → Java**: XMLのstatement id属性から、対応するJavaのメソッド定義へジャンプ

### 使い方

Mapperインターフェースのメソッド名、またはXMLのstatement id上で以下の操作を行う:

- `Ctrl+Click`（Mac: `Cmd+Click`）
- `F12`（Go to Definition）

### 設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `mybatis-bridge.javaMapperPatterns` | JavaのMapperファイルを検索するglobパターン | `["**/*Mapper.java", "**/*Dao.java", "**/*Repository.java"]` |
| `mybatis-bridge.xmlMapperPatterns` | XMLのMapperファイルを検索するglobパターン | `["**/resources/**/*.xml", "**/*Mapper.xml"]` |

### 動作要件

- VS Code 1.96.0 以上

### ライセンス

MIT
