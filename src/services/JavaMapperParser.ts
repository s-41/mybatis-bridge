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
 * 開き括弧の位置から対応する閉じ括弧の位置を返す
 * @param line 検索対象の行
 * @param openIndex 開き括弧の位置
 * @returns 閉じ括弧の位置、見つからない場合は-1
 */
function findMatchingParen(line: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < line.length; i++) {
    if (line[i] === "(") {
      depth++;
    } else if (line[i] === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * 予約語セット（モジュールレベルで定数として定義）
 */
const RESERVED_WORDS = new Set([
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
 * パッケージ名とインターフェース名を一度のスキャンで同時に抽出
 * 個別に呼び出すより効率的
 */
function extractPackageAndInterface(content: string): {
  packageName: string | null;
  interfaceName: string | null;
} {
  const packageMatch = content.match(PACKAGE_PATTERN);
  const interfaceMatch = content.match(INTERFACE_PATTERN);

  return {
    packageName: packageMatch ? packageMatch[1] : null,
    interfaceName: interfaceMatch ? interfaceMatch[1] : null,
  };
}

/**
 * Javaコンテンツからメソッド一覧を抽出
 * @Paramアノテーションなどネストした括弧を含む引数にも対応
 */
export function extractMethods(content: string): MethodLocation[] {
  const methods: MethodLocation[] = [];
  const lines = content.split("\n");

  // 各行を走査してメソッドを検出
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Step 1: 戻り値型 + メソッド名 + 開き括弧を検出
    // インターフェースのメソッド定義: 戻り値型 メソッド名(引数);
    // 戻り値型は List<User> や Map<String, Object> などジェネリクスを含む可能性がある
    const signatureMatch = line.match(/(?:[\w<>,\s]+)\s+(\w+)\s*\(/);
    if (!signatureMatch) {
      continue;
    }

    const methodName = signatureMatch[1];
    if (isReservedWord(methodName)) {
      continue;
    }

    // Step 2: 括弧のバランスを追跡して閉じ括弧を見つける
    // @Param("email") のようなネストした括弧に対応
    const openParenIndex = line.indexOf("(", signatureMatch.index!);
    const closeParenIndex = findMatchingParen(line, openParenIndex);
    if (closeParenIndex === -1) {
      continue;
    }

    // Step 3: 閉じ括弧の後に ; または { があるか確認（throws句も許容）
    const afterParen = line.substring(closeParenIndex + 1).trim();
    if (!/^(?:throws\s+[\w,\s]+)?\s*[;{]/.test(afterParen)) {
      continue;
    }

    const column = line.indexOf(methodName);
    methods.push({
      name: methodName,
      line: lineIndex,
      column: column >= 0 ? column : 0,
    });
  }

  return methods;
}

/**
 * 予約語やよくある戻り値型かどうかを判定
 */
function isReservedWord(word: string): boolean {
  return RESERVED_WORDS.has(word);
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

  // パッケージ名とインターフェース名を同時抽出（効率化）
  const { packageName, interfaceName } = extractPackageAndInterface(content);
  if (!packageName || !interfaceName) {
    return null;
  }

  // メソッド一覧を抽出
  const methods = extractMethods(content);

  // O(1)検索用のMapを生成
  const methodMap = new Map<string, MethodLocation>();
  for (const method of methods) {
    methodMap.set(method.name, method);
  }

  return {
    uri,
    packageName,
    interfaceName,
    fullyQualifiedName: `${packageName}.${interfaceName}`,
    methods,
    methodMap,
  };
}

