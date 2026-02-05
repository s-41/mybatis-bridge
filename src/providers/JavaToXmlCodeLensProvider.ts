/**
 * Java → XML ジャンプのCodeLensProvider
 * JavaのMapperインターフェースのメソッド上にCodeLensを表示し、
 * 対応するMyBatis XMLへのジャンプを提供する
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import {
  extractPackageName,
  extractInterfaceName,
  extractMethods,
  isMapperInterface,
} from "../services/JavaMapperParser";
import { isCodeLensEnabled } from "../utils";

/**
 * Java → XML ジャンプのCodeLensProvider
 */
export class JavaToXmlCodeLensProvider implements vscode.CodeLensProvider {
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

    // Javaファイルでなければスキップ
    if (document.languageId !== "java") {
      return [];
    }

    const content = document.getText();

    // Mapperインターフェースでなければスキップ
    if (!isMapperInterface(content)) {
      return [];
    }

    // インデックスを初期化（遅延初期化）
    const indexService = MapperIndexService.getInstance();
    await indexService.ensureInitialized();

    // namespace（完全修飾名）を算出
    const packageName = extractPackageName(content);
    const interfaceName = extractInterfaceName(content);

    if (!packageName || !interfaceName) {
      return [];
    }

    const namespace = `${packageName}.${interfaceName}`;

    // メソッド一覧を取得
    const methods = extractMethods(content);

    // 各メソッドに対してCodeLensを生成
    const codeLenses: vscode.CodeLens[] = [];

    for (const method of methods) {
      // XMLファイル内の該当statementを検索
      const result = indexService.findStatement(namespace, method.name);
      if (!result) {
        continue;
      }

      // CodeLensを作成
      const range = new vscode.Range(
        method.line,
        method.column,
        method.line,
        method.column + method.name.length
      );

      const codeLens = new vscode.CodeLens(range, {
        title: vscode.l10n.t("Go to Mapper XML"),
        command: "mybatis-bridge.goToMapperXml",
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
