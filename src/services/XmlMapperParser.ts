/**
 * MyBatis XMLファイルのパーサー
 * 正規表現ベースの軽量パースで、namespace と statement id を抽出する
 */

import type { StatementLocation, TypeAttributeLocation, XmlMapperInfo } from "../types";
import { sanitizeXmlContent } from "../utils";

/**
 * MyBatis XMLかどうかを判定するパターン
 * - DOCTYPE宣言に "mybatis" が含まれる
 * - または <mapper namespace= パターンが存在する
 */
const MYBATIS_DOCTYPE_PATTERN = /<!DOCTYPE\s+mapper[^>]*mybatis/i;
const MAPPER_NAMESPACE_PATTERN = /<mapper\s+[^>]*namespace\s*=\s*["']([^"']+)["']/;

/**
 * statement要素を抽出するパターン（モジュールレベルで定義）
 * - `s`フラグで`.`が改行にもマッチ
 * - `[^>]*?`で非貪欲マッチ（複数行タグに対応）
 */
const STATEMENT_PATTERN =
  /<(select|insert|update|delete|resultMap|sql)\s+[^>]*?id\s*=\s*["']([^"']+)["']/gis;

/**
 * XMLコンテンツがMyBatis XMLかどうかを判定
 */
export function isMyBatisXml(content: string): boolean {
  const sanitized = sanitizeXmlContent(content);
  return (
    MYBATIS_DOCTYPE_PATTERN.test(sanitized) ||
    MAPPER_NAMESPACE_PATTERN.test(sanitized)
  );
}

/**
 * XMLコンテンツからnamespaceを抽出
 */
export function extractNamespace(content: string): string | null {
  const sanitized = sanitizeXmlContent(content);
  const match = sanitized.match(MAPPER_NAMESPACE_PATTERN);
  return match ? match[1] : null;
}

/**
 * XMLコンテンツからstatement一覧を抽出
 * 複数行にまたがるタグ定義にも対応
 */
export function extractStatements(content: string): StatementLocation[] {
  const sanitized = sanitizeXmlContent(content);
  const statements: StatementLocation[] = [];

  // グローバル正規表現のlastIndexをリセット
  STATEMENT_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = STATEMENT_PATTERN.exec(sanitized)) !== null) {
    // タイプを正規化（resultMapは大文字小文字を保持、その他はlowercase）
    const rawType = match[1].toLowerCase();
    const type = (
      rawType === "resultmap" ? "resultMap" : rawType
    ) as StatementLocation["type"];
    const id = match[2];

    // マッチ位置から行番号を計算
    const beforeMatch = sanitized.substring(0, match.index);
    const line = (beforeMatch.match(/\n/g) || []).length;

    // カラム計算（最後の改行からの距離）
    const lastNewline = beforeMatch.lastIndexOf("\n");
    const column = lastNewline === -1 ? match.index : match.index - lastNewline - 1;

    statements.push({
      id,
      type,
      line,
      column,
    });
  }

  return statements;
}

/**
 * XMLファイルの内容をパースしてXmlMapperInfoを生成
 * @param uri ファイルのURI
 * @param content ファイルの内容
 * @returns パース結果、MyBatis XMLでない場合はnull
 */
export function parseXmlMapper(
  uri: string,
  content: string
): XmlMapperInfo | null {
  // MyBatis XMLかどうかを判定
  if (!isMyBatisXml(content)) {
    return null;
  }

  // namespaceを抽出
  const namespace = extractNamespace(content);
  if (!namespace) {
    return null;
  }

  // statement一覧を抽出
  const statements = extractStatements(content);

  // O(1)検索用のMapを生成
  const statementMap = new Map<string, StatementLocation>();
  for (const statement of statements) {
    statementMap.set(statement.id, statement);
  }

  return {
    uri,
    namespace,
    statements,
    statementMap,
  };
}

/**
 * type系属性を抽出する正規表現パターン
 */
const TYPE_ATTRIBUTE_PATTERN =
  /\b(?:type|resultType|parameterType|ofType|javaType)\s*=\s*["']([^"']+)["']/g;

/**
 * FQN（ドットを含む完全修飾名）かどうかを判定
 */
function isFqn(value: string): boolean {
  return value.includes(".");
}

/**
 * 指定した行・列がtype/resultType/parameterType属性のFQN値内かどうかを判定
 * @param content XMLファイルの内容
 * @param line カーソル行（0-based）
 * @param column カーソル列（0-based）
 * @returns TypeAttributeLocation、またはnull
 */
export function getTypeAttributeAtPosition(
  content: string,
  line: number,
  column: number
): TypeAttributeLocation | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) {
    return null;
  }

  const lineText = lines[line];

  const pattern = new RegExp(TYPE_ATTRIBUTE_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(lineText)) !== null) {
    const fqn = match[1];

    // エイリアス（ドットなし）はスキップ
    if (!isFqn(fqn)) {
      continue;
    }

    // 属性値の開始位置と終了位置を計算
    const valueStartIndex = match.index + match[0].indexOf(fqn);
    const valueEndIndex = valueStartIndex + fqn.length;

    // カーソルが属性値内にあるかチェック
    if (column >= valueStartIndex && column <= valueEndIndex) {
      // 属性名を抽出
      const attrNameMatch = match[0].match(/^(\w+)/);
      const attributeName = attrNameMatch ? attrNameMatch[1] : "type";

      return {
        attributeName,
        fqn,
        line,
        column: valueStartIndex,
      };
    }
  }

  return null;
}

/**
 * XMLコンテンツからtype系属性のFQN値と位置情報を一括抽出（CodeLens用）
 * @param content XMLファイルの内容
 * @returns TypeAttributeLocationの配列
 */
export function extractTypeAttributes(content: string): TypeAttributeLocation[] {
  const sanitized = sanitizeXmlContent(content);
  const results: TypeAttributeLocation[] = [];

  const pattern = new RegExp(TYPE_ATTRIBUTE_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sanitized)) !== null) {
    const fqn = match[1];

    // エイリアス（ドットなし）はスキップ
    if (!isFqn(fqn)) {
      continue;
    }

    // マッチ位置から行番号を計算
    const beforeMatch = sanitized.substring(0, match.index);
    const line = (beforeMatch.match(/\n/g) || []).length;

    // 属性値の開始位置を計算
    const valueOffset = match[0].indexOf(fqn);
    const lastNewline = beforeMatch.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const column = match.index - lineStart + valueOffset;

    // 属性名を抽出
    const attrNameMatch = match[0].match(/^(\w+)/);
    const attributeName = attrNameMatch ? attrNameMatch[1] : "type";

    results.push({
      attributeName,
      fqn,
      line,
      column,
    });
  }

  return results;
}

/**
 * resultMap属性を抽出する正規表現パターン
 */
const RESULTMAP_ATTRIBUTE_PATTERN = /\bresultMap\s*=\s*["']([^"']+)["']/g;

/**
 * 指定した行・列がresultMap属性値内かどうかを判定し、属性値を返す
 * @param content XMLファイルの内容
 * @param line カーソル行（0-based）
 * @param column カーソル列（0-based）
 * @returns resultMap属性値、またはnull
 */
export function getResultMapAttributeAtPosition(
  content: string,
  line: number,
  column: number
): string | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) {
    return null;
  }

  const lineText = lines[line];

  const pattern = new RegExp(RESULTMAP_ATTRIBUTE_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(lineText)) !== null) {
    const value = match[1];

    // 属性値の開始位置と終了位置を計算
    const valueStartIndex = match.index + match[0].indexOf(value);
    const valueEndIndex = valueStartIndex + value.length;

    // カーソルが属性値内にあるかチェック
    if (column >= valueStartIndex && column <= valueEndIndex) {
      return value;
    }
  }

  return null;
}

/**
 * refid属性を抽出する正規表現パターン
 */
const REFID_ATTRIBUTE_PATTERN = /\brefid\s*=\s*["']([^"']+)["']/g;

/**
 * 指定した行・列がrefid属性値内かどうかを判定し、属性値を返す
 * @param content XMLファイルの内容
 * @param line カーソル行（0-based）
 * @param column カーソル列（0-based）
 * @returns refid属性値、またはnull
 */
export function getRefidAttributeAtPosition(
  content: string,
  line: number,
  column: number
): string | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) {
    return null;
  }

  const lineText = lines[line];

  const pattern = new RegExp(REFID_ATTRIBUTE_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(lineText)) !== null) {
    const value = match[1];

    // 属性値の開始位置と終了位置を計算
    const valueStartIndex = match.index + match[0].indexOf(value);
    const valueEndIndex = valueStartIndex + value.length;

    // カーソルが属性値内にあるかチェック
    if (column >= valueStartIndex && column <= valueEndIndex) {
      return value;
    }
  }

  return null;
}

/**
 * 指定した行・列がid属性値内かどうかを判定し、id値を返す
 * @param content XMLファイルの内容
 * @param line カーソル行（0-based）
 * @param column カーソル列（0-based）
 * @returns id属性値、またはnull
 */
export function getIdAtPosition(
  content: string,
  line: number,
  column: number
): string | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) {
    return null;
  }

  const lineText = lines[line];

  // id="xxx" または id='xxx' パターンを検索（refidなどを除外するため\bで境界チェック）
  const idPattern = /\bid\s*=\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = idPattern.exec(lineText)) !== null) {
    // id属性値の開始位置と終了位置を計算
    const valueStartIndex = match.index + match[0].indexOf(match[1]);
    const valueEndIndex = valueStartIndex + match[1].length;

    // カーソルがid属性値内にあるかチェック
    if (column >= valueStartIndex && column <= valueEndIndex) {
      return match[1];
    }
  }

  return null;
}
