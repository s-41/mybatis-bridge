import * as vscode from "vscode";
import {
  JavaToXmlDefinitionProvider,
  XmlToJavaDefinitionProvider,
  JavaToXmlCodeLensProvider,
  XmlToJavaCodeLensProvider,
  MapperUsageCodeLensProvider,
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

  // Java → XML ジャンプのCodeLensProviderを登録
  const javaToXmlCodeLensProvider = vscode.languages.registerCodeLensProvider(
    { language: "java", scheme: "file" },
    new JavaToXmlCodeLensProvider()
  );
  context.subscriptions.push(javaToXmlCodeLensProvider);

  // XML → Java ジャンプのCodeLensProviderを登録
  const xmlToJavaCodeLensProvider = vscode.languages.registerCodeLensProvider(
    { language: "xml", scheme: "file" },
    new XmlToJavaCodeLensProvider()
  );
  context.subscriptions.push(xmlToJavaCodeLensProvider);

  // Mapper呼び出し箇所のCodeLensProviderを登録
  const mapperUsageCodeLensProvider = vscode.languages.registerCodeLensProvider(
    { language: "java", scheme: "file" },
    new MapperUsageCodeLensProvider()
  );
  context.subscriptions.push(mapperUsageCodeLensProvider);

  console.log(vscode.l10n.t("[MyBatis Bridge] CodeLensProvider registered"));

  // CodeLensのジャンプコマンドを登録
  // 共通のジャンプ処理
  const goToLocation = async (uri: vscode.Uri, position: vscode.Position) => {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("mybatis-bridge.goToMapperXml", goToLocation),
    vscode.commands.registerCommand("mybatis-bridge.goToMapperInterface", goToLocation)
  );
}

/**
 * 拡張機能が非アクティブ化されたときに呼び出される
 */
export function deactivate(): void {
  // MapperIndexServiceのリソースを解放
  MapperIndexService.resetInstance();
  console.log(vscode.l10n.t("[MyBatis Bridge] Resources released"));
}
