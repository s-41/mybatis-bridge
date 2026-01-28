/**
 * Java → XML ジャンプのDefinitionProvider
 * JavaのMapperインターフェースのメソッド名からMyBatis XMLのstatementへジャンプする
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import { extractPackageName, extractInterfaceName } from "../services/JavaMapperParser";

/**
 * カーソル位置にあるメソッド名を取得
 */
function getMethodNameAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): string | null {
  const line = document.lineAt(position.line).text;
  const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);

  if (!wordRange) {
    return null;
  }

  const word = document.getText(wordRange);

  // その単語がメソッド名かどうかを確認（後ろに括弧があるか）
  const afterWord = line.substring(wordRange.end.character);
  if (/^\s*\(/.test(afterWord)) {
    return word;
  }

  // インターフェースのメソッド定義の場合（戻り値の型の後にメソッド名）
  // 例: List<User> findAll();
  const beforeWord = line.substring(0, wordRange.start.character);
  if (/\s+$/.test(beforeWord) && /^\s*\([^)]*\)\s*;/.test(afterWord)) {
    return word;
  }

  return null;
}

/**
 * Java → XML ジャンプのDefinitionProvider
 */
export class JavaToXmlDefinitionProvider implements vscode.DefinitionProvider {
  /**
   * 定義へジャンプ
   */
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    // Javaファイルでなければスキップ
    if (document.languageId !== "java") {
      return undefined;
    }

    // インデックスを初期化（遅延初期化）
    const indexService = MapperIndexService.getInstance();
    await indexService.ensureInitialized();

    // カーソル位置のメソッド名を取得
    const methodName = getMethodNameAtPosition(document, position);
    if (!methodName) {
      return undefined;
    }

    // Javaファイルからnamespaceを算出
    const content = document.getText();
    const packageName = extractPackageName(content);
    const interfaceName = extractInterfaceName(content);

    if (!packageName || !interfaceName) {
      return undefined;
    }

    const namespace = `${packageName}.${interfaceName}`;

    // XMLファイル内の該当statementを検索
    const result = indexService.findStatement(namespace, methodName);
    if (!result) {
      return undefined;
    }

    // vscode.Locationを返却
    return new vscode.Location(
      vscode.Uri.parse(result.uri),
      new vscode.Position(result.location.line, result.location.column)
    );
  }
}
