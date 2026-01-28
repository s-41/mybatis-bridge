/**
 * MyBatis XMLファイルのパーサー
 * 正規表現ベースの軽量パースで、namespace と statement id を抽出する
 */

import type { StatementLocation, XmlMapperInfo } from "../types";

/**
 * MyBatis XMLかどうかを判定するパターン
 * - DOCTYPE宣言に "mybatis" が含まれる
 * - または <mapper namespace= パターンが存在する
 */
const MYBATIS_DOCTYPE_PATTERN = /<!DOCTYPE\s+mapper[^>]*mybatis/i;
const MAPPER_NAMESPACE_PATTERN = /<mapper\s+[^>]*namespace\s*=\s*["']([^"']+)["']/;

/**
 * statement要素を抽出するパターン（モジュールレベルで定義）
 */
const STATEMENT_PATTERN =
  /<(select|insert|update|delete|resultMap)\s+[^>]*id\s*=\s*["']([^"']+)["']/gi;

/**
 * XMLコンテンツがMyBatis XMLかどうかを判定
 */
export function isMyBatisXml(content: string): boolean {
  return (
    MYBATIS_DOCTYPE_PATTERN.test(content) ||
    MAPPER_NAMESPACE_PATTERN.test(content)
  );
}

/**
 * XMLコンテンツからnamespaceを抽出
 */
export function extractNamespace(content: string): string | null {
  const match = content.match(MAPPER_NAMESPACE_PATTERN);
  return match ? match[1] : null;
}

/**
 * XMLコンテンツからstatement一覧を抽出
 */
export function extractStatements(content: string): StatementLocation[] {
  const statements: StatementLocation[] = [];
  const lines = content.split("\n");

  // 各行を走査してstatementを検出
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // グローバル正規表現のlastIndexをリセット
    STATEMENT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = STATEMENT_PATTERN.exec(line)) !== null) {
      // タイプを正規化（resultMapは大文字小文字を保持）
      const rawType = match[1].toLowerCase();
      const type = (
        rawType === "resultmap" ? "resultMap" : rawType
      ) as StatementLocation["type"];
      const id = match[2];
      const column = match.index;

      statements.push({
        id,
        type,
        line: lineIndex,
        column,
      });
    }
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

  // id="xxx" または id='xxx' パターンを検索
  const idPattern = /id\s*=\s*["']([^"']+)["']/g;
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
