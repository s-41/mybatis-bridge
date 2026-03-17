/**
 * XML → Java ジャンプのCodeLensProvider
 * MyBatis XMLのstatement上にCodeLensを表示し、
 * 対応するJavaのMapperインターフェースへのジャンプを提供する
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import {
  isMyBatisXml,
  extractNamespace,
  extractStatements,
  extractTypeAttributes,
} from "../services/XmlMapperParser";
import { isCodeLensEnabled } from "../utils";

/**
 * XML → Java ジャンプのCodeLensProvider
 */
export class XmlToJavaCodeLensProvider implements vscode.CodeLensProvider {
  /**
   * CodeLensを提供
   */
  async provideCodeLenses(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    // 設定が無効ならスキップ
    if (!isCodeLensEnabled()) {
      return [];
    }

    // XMLファイルでなければスキップ
    if (document.languageId !== "xml") {
      return [];
    }

    const content = document.getText();

    // MyBatis XMLでなければスキップ
    if (!isMyBatisXml(content)) {
      return [];
    }

    // インデックスを初期化（遅延初期化）
    const indexService = MapperIndexService.getInstance();
    await indexService.ensureInitialized();

    // namespaceを取得
    const namespace = extractNamespace(content);
    if (!namespace) {
      return [];
    }

    // statement一覧を取得
    const statements = extractStatements(content);

    // 各statementに対してCodeLensを生成
    const codeLenses: vscode.CodeLens[] = [];

    for (const statement of statements) {
      // Javaファイル内の該当メソッドを検索
      const result = indexService.findMethod(namespace, statement.id);
      if (!result) {
        continue;
      }

      // CodeLensを作成
      const range = new vscode.Range(
        statement.line,
        statement.column,
        statement.line,
        statement.column + statement.id.length
      );

      const codeLens = new vscode.CodeLens(range, {
        title: vscode.l10n.t("Go to Mapper Interface"),
        command: "mybatis-bridge.goToMapperInterface",
        arguments: [
          vscode.Uri.parse(result.uri),
          new vscode.Position(result.location.line, result.location.column),
        ],
      });

      codeLenses.push(codeLens);
    }

    // type系属性のCodeLensを生成
    const typeAttributes = extractTypeAttributes(content);

    for (const typeAttr of typeAttributes) {
      const result = await indexService.findJavaClassByFqn(typeAttr.fqn);
      if (!result) {
        continue;
      }

      const range = new vscode.Range(
        typeAttr.line,
        typeAttr.column,
        typeAttr.line,
        typeAttr.column + typeAttr.fqn.length
      );

      const typeCodeLens = new vscode.CodeLens(range, {
        title: vscode.l10n.t("Go to Type Class"),
        command: "mybatis-bridge.goToTypeClass",
        arguments: [
          result.uri,
          new vscode.Position(result.line, result.column),
        ],
      });

      codeLenses.push(typeCodeLens);
    }

    return codeLenses;
  }
}
