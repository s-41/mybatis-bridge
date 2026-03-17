/**
 * XML → Java ジャンプのDefinitionProvider
 * MyBatis XMLのstatement idからJavaのMapperインターフェースのメソッドへジャンプする
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import { extractNamespace, getIdAtPosition, getRefidAttributeAtPosition, getResultMapAttributeAtPosition, getTypeAttributeAtPosition } from "../services/XmlMapperParser";

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
    if (statementId) {
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

    // カーソル位置がtype/resultType/parameterType属性のFQN値内かを判定
    const typeAttr = getTypeAttributeAtPosition(
      content,
      position.line,
      position.character
    );
    if (typeAttr) {
      const result = await indexService.findJavaClassByFqn(typeAttr.fqn);
      if (result) {
        return new vscode.Location(
          result.uri,
          new vscode.Position(result.line, result.column)
        );
      }
    }

    // カーソル位置がrefid属性値内かを判定
    const refid = getRefidAttributeAtPosition(
      content,
      position.line,
      position.character
    );
    if (refid) {
      const xmlMapper = indexService.getXmlMapperByUri(document.uri.toString());
      if (xmlMapper) {
        const statement = xmlMapper.statementMap.get(refid);
        if (statement && statement.type === "sql") {
          return new vscode.Location(
            document.uri,
            new vscode.Position(statement.line, statement.column)
          );
        }
      }
    }

    // カーソル位置がresultMap属性値内かを判定
    const resultMapId = getResultMapAttributeAtPosition(
      content,
      position.line,
      position.character
    );
    if (resultMapId) {
      const xmlMapper = indexService.getXmlMapperByUri(document.uri.toString());
      if (xmlMapper) {
        const statement = xmlMapper.statementMap.get(resultMapId);
        if (statement && statement.type === "resultMap") {
          return new vscode.Location(
            document.uri,
            new vscode.Position(statement.line, statement.column)
          );
        }
      }
    }

    return undefined;
  }
}
