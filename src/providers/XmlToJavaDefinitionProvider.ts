/**
 * XML → Java ジャンプのDefinitionProvider
 * MyBatis XMLのstatement idからJavaのMapperインターフェースのメソッドへジャンプする
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import { extractNamespace, getIdAtPosition } from "../services/XmlMapperParser";

/**
 * XML → Java ジャンプのDefinitionProvider
 */
export class XmlToJavaDefinitionProvider implements vscode.DefinitionProvider {
  /**
   * 定義へジャンプ
   */
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    // XMLファイルでなければスキップ
    if (document.languageId !== "xml") {
      return undefined;
    }

    // インデックスを初期化（遅延初期化）
    const indexService = MapperIndexService.getInstance();
    await indexService.ensureInitialized();

    const content = document.getText();

    // カーソル位置がid属性値内かを判定
    const statementId = getIdAtPosition(
      content,
      position.line,
      position.character
    );
    if (!statementId) {
      return undefined;
    }

    // XMLファイルからnamespaceを取得
    const namespace = extractNamespace(content);
    if (!namespace) {
      return undefined;
    }

    // Javaファイル内の該当メソッドを検索
    const result = indexService.findMethod(namespace, statementId);
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
