import * as vscode from "vscode";

/**
 * 拡張機能がアクティブ化されたときに呼び出される
 * @param context - 拡張機能コンテキスト
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('拡張機能 "mybatis-bridge" がアクティブ化されました');

  // コマンドの登録
  const disposable = vscode.commands.registerCommand(
    "mybatis-bridge.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from MyBatis Bridge!");
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * 拡張機能が非アクティブ化されたときに呼び出される
 */
export function deactivate(): void {
  // クリーンアップ処理があればここに記述
}
