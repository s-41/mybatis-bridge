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

/**
 * Mapper呼び出し箇所のCodeLens設定が有効かどうかを確認
 * @returns Mapper呼び出し箇所のCodeLensが有効ならtrue
 */
export function isMapperUsageCodeLensEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("mybatis-bridge");
  // enableCodeLensが無効なら、enableMapperUsageCodeLensも無効
  if (!isCodeLensEnabled()) {
    return false;
  }
  return config.get<boolean>("enableMapperUsageCodeLens") ?? true;
}
