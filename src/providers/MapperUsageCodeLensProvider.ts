/**
 * Mapper呼び出し箇所のCodeLensProvider
 * ServiceクラスなどでMapperを呼び出している箇所にCodeLensを表示し、
 * 対応するMyBatis XMLへのジャンプを提供する
 */

import * as vscode from "vscode";
import { MapperIndexService } from "../services/MapperIndexService";
import {
  buildImportMap,
  extractMapperFields,
  extractMapperCalls,
} from "../services/MapperUsageParser";
import { isMapperUsageCodeLensEnabled } from "../utils";

/**
 * Mapper呼び出し箇所のCodeLensProvider
 */
export class MapperUsageCodeLensProvider implements vscode.CodeLensProvider {
  /**
   * CodeLensを提供
   */
  async provideCodeLenses(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    // 設定が無効ならスキップ
    if (!isMapperUsageCodeLensEnabled()) {
      return [];
    }

    // Javaファイルでなければスキップ
    if (document.languageId !== "java") {
      return [];
    }

    // インデックスを初期化（遅延初期化）
    const indexService = MapperIndexService.getInstance();
    await indexService.ensureInitialized();

    const content = document.getText();
    const knownMapperFqns = indexService.getKnownMapperFqns();

    // 既知のMapperがなければスキップ
    if (knownMapperFqns.size === 0) {
      return [];
    }

    // import文からクラス名→FQNのマップを構築
    const importMap = buildImportMap(content);

    // Mapperフィールドを抽出
    const mapperFields = extractMapperFields(
      content,
      importMap,
      knownMapperFqns
    );

    // Mapperフィールドがなければスキップ
    if (mapperFields.length === 0) {
      return [];
    }

    // メソッド呼び出しを抽出
    const calls = extractMapperCalls(content, mapperFields);

    // CodeLensを生成
    const codeLenses: vscode.CodeLens[] = [];

    for (const call of calls) {
      // XMLファイル内の該当statementを検索
      const result = indexService.findStatement(call.mapperFqn, call.methodName);
      if (!result) {
        continue;
      }

      // CodeLensを作成
      const range = new vscode.Range(
        call.line,
        call.column,
        call.line,
        call.column + call.fieldName.length + 1 + call.methodName.length
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
