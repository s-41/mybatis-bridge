/**
 * Mapper呼び出し解析パーサー
 * ServiceクラスなどでのMapper呼び出しを検出するための正規表現ベースのパーサー
 */

import type { MapperFieldInfo, MapperCallInfo } from "../types";
import { sanitizeJavaContent } from "../utils";

/**
 * import文のパターン
 * 例: import com.example.mapper.UserMapper;
 */
const IMPORT_PATTERN = /^\s*import\s+([\w.]+);/gm;

/**
 * フィールド宣言のパターン（アノテーション対応）
 * 例: @Autowired private UserMapper userMapper;
 * 例: private final UserMapper userMapper;
 * 例: @Resource UserMapper userMapper;
 */
const FIELD_PATTERN =
  /(?:@\w+(?:\([^)]*\))?\s*)*(?:private|protected|public)?\s*(?:final\s+)?(\w+)\s+(\w+)\s*[;=]/g;

/**
 * メソッドパラメータのパターン
 * 例: public void execute(UserMapper userMapper, String name)
 * アノテーション付きパラメータにも対応
 */
const PARAM_VAR_PATTERN = /(?:@\w+(?:\([^)]*\))?\s+)*(\w+)\s+(\w+)\s*[,)]/g;

/**
 * メソッド呼び出しのパターン
 * 例: userMapper.findById(id)
 */
const CALL_PATTERN = /\b(\w+)\.(\w+)\s*\(/g;

/**
 * import文からクラス名→FQNのマップを構築
 * @param content - Javaファイルの内容
 * @returns クラス名からFQNへのマップ
 */
export function buildImportMap(content: string): Map<string, string> {
  const importMap = new Map<string, string>();
  let match: RegExpExecArray | null;

  // パターンをリセット
  IMPORT_PATTERN.lastIndex = 0;

  while ((match = IMPORT_PATTERN.exec(content)) !== null) {
    const fqn = match[1];
    // ワイルドカードimportは無視
    if (fqn.endsWith("*")) {
      continue;
    }
    // 最後のドット以降がクラス名
    const lastDot = fqn.lastIndexOf(".");
    if (lastDot !== -1) {
      const className = fqn.substring(lastDot + 1);
      importMap.set(className, fqn);
    }
  }

  return importMap;
}

/**
 * Mapperフィールドを抽出
 * @param content - Javaファイルの内容
 * @param importMap - クラス名→FQNのマップ
 * @param knownMapperFqns - 既知のMapper FQNのセット
 * @returns Mapperフィールド情報の配列
 */
export function extractMapperFields(
  content: string,
  importMap: Map<string, string>,
  knownMapperFqns: Set<string>
): MapperFieldInfo[] {
  const fields: MapperFieldInfo[] = [];
  const sanitized = sanitizeJavaContent(content);
  const lines = sanitized.split("\n");
  const seenFieldNames = new Set<string>();

  function tryAddField(typeName: string, fieldName: string, line: number) {
    if (seenFieldNames.has(fieldName)) {
      return;
    }
    const fqn = importMap.get(typeName);
    if (!fqn) {
      return;
    }
    if (!knownMapperFqns.has(fqn)) {
      return;
    }
    seenFieldNames.add(fieldName);
    fields.push({
      fieldName,
      mapperType: typeName,
      mapperFqn: fqn,
      line,
    });
  }

  // 行ごとにフィールド宣言とメソッドパラメータをチェック
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // 既存: フィールド宣言パターン
    FIELD_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FIELD_PATTERN.exec(line)) !== null) {
      tryAddField(match[1], match[2], lineIndex);
    }

    // 新規: メソッドパラメータパターン
    PARAM_VAR_PATTERN.lastIndex = 0;
    while ((match = PARAM_VAR_PATTERN.exec(line)) !== null) {
      tryAddField(match[1], match[2], lineIndex);
    }
  }

  return fields;
}

/**
 * メソッド呼び出しを抽出
 * @param content - Javaファイルの内容
 * @param mapperFields - 検出されたMapperフィールドの配列
 * @returns メソッド呼び出し情報の配列
 */
export function extractMapperCalls(
  content: string,
  mapperFields: MapperFieldInfo[]
): MapperCallInfo[] {
  if (mapperFields.length === 0) {
    return [];
  }

  // フィールド名→MapperFieldInfoのマップを構築
  const fieldMap = new Map<string, MapperFieldInfo>();
  for (const field of mapperFields) {
    fieldMap.set(field.fieldName, field);
  }

  const calls: MapperCallInfo[] = [];
  const sanitized = sanitizeJavaContent(content);
  const lines = sanitized.split("\n");

  // 行ごとにメソッド呼び出しをチェック
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // パターンをリセット
    CALL_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = CALL_PATTERN.exec(line)) !== null) {
      const fieldName = match[1];
      const methodName = match[2];

      // Mapperフィールドの呼び出しかどうか確認
      const field = fieldMap.get(fieldName);
      if (field) {
        calls.push({
          fieldName,
          methodName,
          line: lineIndex,
          column: match.index,
          mapperFqn: field.mapperFqn,
        });
      }
    }
  }

  return calls;
}
