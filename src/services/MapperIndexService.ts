/**
 * Mapperインデックスサービス
 * XMLとJavaのMapperファイルをインデックス化し、キャッシュを管理する
 */

import * as vscode from "vscode";
import type {
  IndexState,
  JavaMapperInfo,
  XmlMapperInfo,
  StatementLocation,
  MethodLocation,
} from "../types";
import { parseXmlMapper } from "./XmlMapperParser";
import { parseJavaMapper } from "./JavaMapperParser";

/**
 * デフォルトのXMLマッパーパターン
 */
const DEFAULT_XML_PATTERNS = ["**/resources/**/*.xml", "**/*Mapper.xml"];

/**
 * デフォルトのJavaマッパーパターン
 */
const DEFAULT_JAVA_PATTERNS = ["**/*Mapper.java", "**/*Dao.java", "**/*Repository.java"];

/**
 * Mapperインデックスサービス（シングルトン）
 */
export class MapperIndexService {
  private static instance: MapperIndexService | null = null;

  /** インデックスの状態 */
  private state: IndexState = "uninitialized";

  /** namespace → XmlMapperInfo のマップ */
  private xmlMappersByNamespace: Map<string, XmlMapperInfo> = new Map();

  /** URI → XmlMapperInfo のマップ（高速逆引き用） */
  private xmlMappersByUri: Map<string, XmlMapperInfo> = new Map();

  /** 完全修飾名 → JavaMapperInfo のマップ */
  private javaMappersByFqn: Map<string, JavaMapperInfo> = new Map();

  /** URI → JavaMapperInfo のマップ（高速逆引き用） */
  private javaMappersByUri: Map<string, JavaMapperInfo> = new Map();

  /** FileSystemWatcherのdisposables */
  private watchers: vscode.Disposable[] = [];

  /** 初期化Promiseをキャッシュして重複初期化を防ぐ */
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // シングルトンのためprivate
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): MapperIndexService {
    if (!MapperIndexService.instance) {
      MapperIndexService.instance = new MapperIndexService();
    }
    return MapperIndexService.instance;
  }

  /**
   * インスタンスを破棄（テスト用）
   */
  static resetInstance(): void {
    if (MapperIndexService.instance) {
      MapperIndexService.instance.dispose();
      MapperIndexService.instance = null;
    }
  }

  /**
   * インデックスが準備完了かどうか
   */
  isReady(): boolean {
    return this.state === "ready";
  }

  /**
   * 遅延初期化を実行
   * 初回呼び出し時のみスキャンを実行し、以降はキャッシュを返す
   */
  async ensureInitialized(): Promise<void> {
    if (this.state === "ready") {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    this.state = "initializing";
    console.log(vscode.l10n.t("[MyBatis Bridge] Starting index initialization..."));

    try {
      // XMLファイルをスキャン
      await this.scanXmlMappers();

      // Javaファイルをスキャン
      await this.scanJavaMappers();

      // FileSystemWatcherを設定
      this.setupWatchers();

      this.state = "ready";
      console.log(
        vscode.l10n.t(
          "[MyBatis Bridge] Index initialization complete: XML {0} files, Java {1} files",
          this.xmlMappersByNamespace.size,
          this.javaMappersByFqn.size
        )
      );
    } catch (error) {
      this.state = "uninitialized";
      this.initPromise = null;
      console.error(vscode.l10n.t("[MyBatis Bridge] Index initialization error:"), error);
      throw error;
    }
  }

  /**
   * 設定からXMLパターンを取得
   */
  private getXmlPatterns(): string[] {
    const config = vscode.workspace.getConfiguration("mybatis-bridge");
    return config.get<string[]>("xmlMapperPatterns") ?? DEFAULT_XML_PATTERNS;
  }

  /**
   * 設定からJavaパターンを取得
   */
  private getJavaPatterns(): string[] {
    const config = vscode.workspace.getConfiguration("mybatis-bridge");
    return config.get<string[]>("javaMapperPatterns") ?? DEFAULT_JAVA_PATTERNS;
  }

  /**
   * XMLマッパーファイルをスキャン（並列処理で高速化）
   */
  private async scanXmlMappers(): Promise<void> {
    const patterns = this.getXmlPatterns();
    const pattern = `{${patterns.join(",")}}`;

    const files = await vscode.workspace.findFiles(
      pattern,
      "**/node_modules/**"
    );

    // 並列処理でファイルをインデックス
    await Promise.all(files.map((file) => this.indexXmlFile(file.toString())));
  }

  /**
   * Javaマッパーファイルをスキャン（並列処理で高速化）
   */
  private async scanJavaMappers(): Promise<void> {
    const patterns = this.getJavaPatterns();
    const pattern = `{${patterns.join(",")}}`;

    const files = await vscode.workspace.findFiles(
      pattern,
      "**/node_modules/**"
    );

    // 並列処理でファイルをインデックス
    await Promise.all(files.map((file) => this.indexJavaFile(file.toString())));
  }

  /**
   * XMLファイルをインデックスに追加
   */
  private async indexXmlFile(uri: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(uri)
      );
      const content = document.getText();
      const mapperInfo = parseXmlMapper(uri, content);

      if (mapperInfo) {
        // 古いエントリを削除
        const oldInfo = this.xmlMappersByUri.get(uri);
        if (oldInfo) {
          this.xmlMappersByNamespace.delete(oldInfo.namespace);
        }

        // 新しいエントリを追加
        this.xmlMappersByNamespace.set(mapperInfo.namespace, mapperInfo);
        this.xmlMappersByUri.set(uri, mapperInfo);
      }
    } catch (error) {
      console.warn(vscode.l10n.t("[MyBatis Bridge] XML file parse error: {0}", uri), error);
    }
  }

  /**
   * Javaファイルをインデックスに追加
   */
  private async indexJavaFile(uri: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(uri)
      );
      const content = document.getText();
      const mapperInfo = parseJavaMapper(uri, content);

      if (mapperInfo) {
        // 古いエントリを削除
        const oldInfo = this.javaMappersByUri.get(uri);
        if (oldInfo) {
          this.javaMappersByFqn.delete(oldInfo.fullyQualifiedName);
        }

        // 新しいエントリを追加
        this.javaMappersByFqn.set(mapperInfo.fullyQualifiedName, mapperInfo);
        this.javaMappersByUri.set(uri, mapperInfo);
      }
    } catch (error) {
      console.warn(vscode.l10n.t("[MyBatis Bridge] Java file parse error: {0}", uri), error);
    }
  }

  /**
   * ファイルをインデックスから削除
   */
  private removeFromIndex(uri: string): void {
    // XMLインデックスから削除
    const xmlInfo = this.xmlMappersByUri.get(uri);
    if (xmlInfo) {
      this.xmlMappersByNamespace.delete(xmlInfo.namespace);
      this.xmlMappersByUri.delete(uri);
    }

    // Javaインデックスから削除
    const javaInfo = this.javaMappersByUri.get(uri);
    if (javaInfo) {
      this.javaMappersByFqn.delete(javaInfo.fullyQualifiedName);
      this.javaMappersByUri.delete(uri);
    }
  }

  /**
   * FileSystemWatcherを設定
   */
  private setupWatchers(): void {
    // XMLファイルのWatcher
    const xmlPatterns = this.getXmlPatterns();
    for (const pattern of xmlPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate((uri) => this.indexXmlFile(uri.toString()));
      watcher.onDidChange((uri) => this.indexXmlFile(uri.toString()));
      watcher.onDidDelete((uri) => this.removeFromIndex(uri.toString()));

      this.watchers.push(watcher);
    }

    // JavaファイルのWatcher
    const javaPatterns = this.getJavaPatterns();
    for (const pattern of javaPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate((uri) => this.indexJavaFile(uri.toString()));
      watcher.onDidChange((uri) => this.indexJavaFile(uri.toString()));
      watcher.onDidDelete((uri) => this.removeFromIndex(uri.toString()));

      this.watchers.push(watcher);
    }
  }

  /**
   * namespaceからXmlMapperInfoを取得
   */
  getXmlMapperByNamespace(namespace: string): XmlMapperInfo | undefined {
    return this.xmlMappersByNamespace.get(namespace);
  }

  /**
   * URIからXmlMapperInfoを取得
   */
  getXmlMapperByUri(uri: string): XmlMapperInfo | undefined {
    return this.xmlMappersByUri.get(uri);
  }

  /**
   * 完全修飾名からJavaMapperInfoを取得
   */
  getJavaMapperByFqn(fqn: string): JavaMapperInfo | undefined {
    return this.javaMappersByFqn.get(fqn);
  }

  /**
   * URIからJavaMapperInfoを取得
   */
  getJavaMapperByUri(uri: string): JavaMapperInfo | undefined {
    return this.javaMappersByUri.get(uri);
  }

  /**
   * namespaceとstatement idからStatementLocationを取得
   */
  findStatement(
    namespace: string,
    statementId: string
  ): { uri: string; location: StatementLocation } | undefined {
    const xmlMapper = this.xmlMappersByNamespace.get(namespace);
    if (!xmlMapper) {
      return undefined;
    }

    // O(1)検索: Mapを使用
    const statement = xmlMapper.statementMap.get(statementId);
    if (!statement) {
      return undefined;
    }

    return {
      uri: xmlMapper.uri,
      location: statement,
    };
  }

  /**
   * namespaceとメソッド名からMethodLocationを取得
   */
  findMethod(
    namespace: string,
    methodName: string
  ): { uri: string; location: MethodLocation } | undefined {
    const javaMapper = this.javaMappersByFqn.get(namespace);
    if (!javaMapper) {
      return undefined;
    }

    // O(1)検索: Mapを使用
    const method = javaMapper.methodMap.get(methodName);
    if (!method) {
      return undefined;
    }

    return {
      uri: javaMapper.uri,
      location: method,
    };
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
    this.xmlMappersByNamespace.clear();
    this.xmlMappersByUri.clear();
    this.javaMappersByFqn.clear();
    this.javaMappersByUri.clear();
    this.state = "uninitialized";
    this.initPromise = null;
  }
}
