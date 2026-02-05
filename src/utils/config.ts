/**
 * 設定関連のユーティリティ関数
 */

import * as vscode from "vscode";

/**
 * CodeLens設定が有効かどうかを確認
 * @returns CodeLensが有効ならtrue
 */
export function isCodeLensEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("mybatis-bridge");
  return config.get<boolean>("enableCodeLens") ?? true;
}
