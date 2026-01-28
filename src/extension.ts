import * as vscode from "vscode";
import {
  JavaToXmlDefinitionProvider,
  XmlToJavaDefinitionProvider,
} from "./providers";
import { MapperIndexService } from "./services";

/**
 * 拡張機能がアクティブ化されたときに呼び出される
 * @param context - 拡張機能コンテキスト
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log(vscode.l10n.t('Extension "mybatis-bridge" has been activated'));

  // Java → XML ジャンプのDefinitionProviderを登録
  const javaToXmlProvider = vscode.languages.registerDefinitionProvider(
    { language: "java", scheme: "file" },
    new JavaToXmlDefinitionProvider()
  );
  context.subscriptions.push(javaToXmlProvider);

  // XML → Java ジャンプのDefinitionProviderを登録
  const xmlToJavaProvider = vscode.languages.registerDefinitionProvider(
    { language: "xml", scheme: "file" },
    new XmlToJavaDefinitionProvider()
  );
  context.subscriptions.push(xmlToJavaProvider);

  console.log(vscode.l10n.t("[MyBatis Bridge] DefinitionProvider registered"));
}

/**
 * 拡張機能が非アクティブ化されたときに呼び出される
 */
export function deactivate(): void {
  // MapperIndexServiceのリソースを解放
  MapperIndexService.resetInstance();
  console.log(vscode.l10n.t("[MyBatis Bridge] Resources released"));
}
