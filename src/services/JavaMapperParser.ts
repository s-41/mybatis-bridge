/**
 * Java Mapperファイルのパーサー
 * 正規表現ベースの軽量パースで、package名、interface名、メソッド名を抽出する
 */

import type { JavaMapperInfo, MethodLocation } from "../types";

/**
 * パッケージ宣言を抽出するパターン
 */
const PACKAGE_PATTERN = /^\s*package\s+([\w.]+)\s*;/m;

/**
 * インターフェース宣言を抽出するパターン
 */
const INTERFACE_PATTERN = /^\s*(?:public\s+)?interface\s+(\w+)/m;


/**
 * Javaコンテンツからパッケージ名を抽出
 */
export function extractPackageName(content: string): string | null {
  const match = content.match(PACKAGE_PATTERN);
  return match ? match[1] : null;
}

/**
 * Javaコンテンツからインターフェース名を抽出
 */
export function extractInterfaceName(content: string): string | null {
  const match = content.match(INTERFACE_PATTERN);
  return match ? match[1] : null;
}

/**
 * Javaコンテンツからメソッド一覧を抽出
 */
export function extractMethods(content: string): MethodLocation[] {
  const methods: MethodLocation[] = [];
  const lines = content.split("\n");

  // 各行を走査してメソッドを検出
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // メソッド名のパターンをチェック
    // インターフェースのメソッド定義: 戻り値型 メソッド名(引数);
    // 戻り値型は List<User> や Map<String, Object> などジェネリクスを含む可能性がある
    const methodMatch = line.match(
      /(?:[\w<>,\s]+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*[;{]/
    );

    if (methodMatch) {
      const methodName = methodMatch[1];
      // メソッド名の位置を計算
      const column = line.indexOf(methodName);

      // 予約語やアノテーションを除外
      if (!isReservedWord(methodName)) {
        methods.push({
          name: methodName,
          line: lineIndex,
          column: column >= 0 ? column : 0,
        });
      }
    }
  }

  return methods;
}

/**
 * 予約語やよくある戻り値型かどうかを判定
 */
function isReservedWord(word: string): boolean {
  const reserved = new Set([
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "default",
    "break",
    "continue",
    "return",
    "try",
    "catch",
    "finally",
    "throw",
    "throws",
    "new",
    "this",
    "super",
    "class",
    "interface",
    "extends",
    "implements",
    "package",
    "import",
    "public",
    "private",
    "protected",
    "static",
    "final",
    "abstract",
    "native",
    "synchronized",
    "transient",
    "volatile",
    "void",
    "boolean",
    "byte",
    "char",
    "short",
    "int",
    "long",
    "float",
    "double",
  ]);
  return reserved.has(word);
}

/**
 * Javaファイルがマッパーインターフェースかどうかを判定
 */
export function isMapperInterface(content: string): boolean {
  // インターフェース宣言があるかチェック
  return INTERFACE_PATTERN.test(content);
}

/**
 * Javaファイルの内容をパースしてJavaMapperInfoを生成
 * @param uri ファイルのURI
 * @param content ファイルの内容
 * @returns パース結果、マッパーインターフェースでない場合はnull
 */
export function parseJavaMapper(
  uri: string,
  content: string
): JavaMapperInfo | null {
  // インターフェースかどうかを判定
  if (!isMapperInterface(content)) {
    return null;
  }

  // パッケージ名を抽出
  const packageName = extractPackageName(content);
  if (!packageName) {
    return null;
  }

  // インターフェース名を抽出
  const interfaceName = extractInterfaceName(content);
  if (!interfaceName) {
    return null;
  }

  // メソッド一覧を抽出
  const methods = extractMethods(content);

  return {
    uri,
    packageName,
    interfaceName,
    fullyQualifiedName: `${packageName}.${interfaceName}`,
    methods,
  };
}

/**
 * 指定した行・列がメソッド名上かどうかを判定し、メソッド名を返す
 * @param content Javaファイルの内容
 * @param line カーソル行（0-based）
 * @param column カーソル列（0-based）
 * @returns メソッド名、またはnull
 */
export function getMethodNameAtPosition(
  content: string,
  line: number,
  column: number
): string | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) {
    return null;
  }

  const methods = extractMethods(content);

  // 該当行のメソッドを検索
  for (const method of methods) {
    if (method.line === line) {
      // カーソルがメソッド名の範囲内にあるかチェック
      const startCol = method.column;
      const endCol = startCol + method.name.length;

      if (column >= startCol && column <= endCol) {
        return method.name;
      }
    }
  }

  return null;
}
