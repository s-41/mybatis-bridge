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

    return codeLenses;
  }
}
