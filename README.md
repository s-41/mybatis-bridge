# MyBatis Bridge

[English](#english) | [日本語](#日本語)

---

## English

A VS Code extension that enables bidirectional navigation between Java Mapper interfaces and MyBatis XML files.

### Demo

| Java → XML |
|:-:|
| ![Java to XML navigation](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/java-to-xml.gif) |

| XML → Java |
|:-:|
| ![XML to Java navigation](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/xml-to-java.gif) |

| Caller → XML |
|:-:|
| ![Caller to XML navigation](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/codelens.gif) |

### Features

- **Java → XML**: Jump from Mapper interface method names to corresponding XML statements (select/insert/update/delete/resultMap)
- **XML → Java**: Jump from XML statement id attributes to corresponding Java method definitions
- **CodeLens Navigation**: Display navigation links directly in the editor
  - Show "Go to Mapper XML" link above Java Mapper methods
  - Show "Go to Mapper Interface" link above XML statements
  - Show "Go to Mapper XML" link on Mapper method calls in Service/Controller classes

### Usage

Navigate between Java Mapper interfaces and XML files using either:

- **Ctrl+Click** (Mac: `Cmd+Click`) or **F12** on a method name / XML statement id
- **Click the CodeLens link** displayed above methods and statements (e.g. "Go to Mapper XML")

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `mybatis-bridge.javaMapperPatterns` | Glob patterns to find Java Mapper files | `["**/*Mapper.java", "**/*Dao.java", "**/*Repository.java"]` |
| `mybatis-bridge.xmlMapperPatterns` | Glob patterns to find XML Mapper files | `["**/resources/**/*.xml", "**/*Mapper.xml"]` |
| `mybatis-bridge.enableCodeLens` | Enable CodeLens navigation links between Java Mapper and XML | `true` |
| `mybatis-bridge.enableMapperUsageCodeLens` | Enable CodeLens on Mapper method calls in Service/Controller classes | `true` |

### Requirements

- VS Code 1.96.0 or later

### License

MIT

---

## 日本語

JavaのMapperインターフェースとMyBatis XMLファイル間の双方向ジャンプを実現するVS Code拡張機能です。

### デモ

| Java → XML |
|:-:|
| ![Java→XMLナビゲーション](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/java-to-xml.gif) |

| XML → Java |
|:-:|
| ![XML→Javaナビゲーション](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/xml-to-java.gif) |

| 呼び出し元 → XML |
|:-:|
| ![呼び出し元→XMLナビゲーション](https://raw.githubusercontent.com/s-41/mybatis-bridge/main/images/demo/codelens.gif) |

### 機能

- **Java → XML**: Mapperインターフェースのメソッド名から、対応するXMLのstatement（select/insert/update/delete/resultMap）へジャンプ
- **XML → Java**: XMLのstatement id属性から、対応するJavaのメソッド定義へジャンプ
- **CodeLensナビゲーション**: エディタ上に直接ナビゲーションリンクを表示
  - JavaのMapperメソッド上に「Go to Mapper XML」リンクを表示
  - XMLのstatement上に「Go to Mapper Interface」リンクを表示
  - Service/ControllerクラスでのMapperメソッド呼び出し箇所に「Go to Mapper XML」リンクを表示

### 使い方

以下のいずれかの方法で、JavaのMapperインターフェースとXMLファイル間をジャンプできます:

- メソッド名やXMLのstatement id上で **Ctrl+Click**（Mac: `Cmd+Click`）または **F12**
- メソッドやstatementの上に表示される **CodeLensリンク**（例:「Go to Mapper XML」）をクリック

### 設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `mybatis-bridge.javaMapperPatterns` | JavaのMapperファイルを検索するglobパターン | `["**/*Mapper.java", "**/*Dao.java", "**/*Repository.java"]` |
| `mybatis-bridge.xmlMapperPatterns` | XMLのMapperファイルを検索するglobパターン | `["**/resources/**/*.xml", "**/*Mapper.xml"]` |
| `mybatis-bridge.enableCodeLens` | JavaマッパーとXML間のナビゲーションリンクをCodeLensで表示する | `true` |
| `mybatis-bridge.enableMapperUsageCodeLens` | Service/ControllerクラスでのMapperメソッド呼び出し箇所にCodeLensを表示する | `true` |

### 動作要件

- VS Code 1.96.0 以上

### ライセンス

MIT
