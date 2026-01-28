/**
 * MyBatis Mapper関連の型定義
 */

/**
 * XMLファイル内のstatement（select, insert, update, delete, resultMap）の位置情報
 */
export interface StatementLocation {
  /** statement の id 属性値 */
  id: string;
  /** statement の種類 */
  type: "select" | "insert" | "update" | "delete" | "resultMap";
  /** 行番号（0-based） */
  line: number;
  /** 列番号（0-based） */
  column: number;
}

/**
 * Javaファイル内のメソッドの位置情報
 */
export interface MethodLocation {
  /** メソッド名 */
  name: string;
  /** 行番号（0-based） */
  line: number;
  /** 列番号（0-based） */
  column: number;
}

/**
 * XMLマッパーファイルの情報
 */
export interface XmlMapperInfo {
  /** XMLファイルのURI */
  uri: string;
  /** namespace属性値（例: com.example.mapper.UserMapper） */
  namespace: string;
  /** ファイル内のstatement一覧 */
  statements: StatementLocation[];
}

/**
 * Javaマッパーファイルの情報
 */
export interface JavaMapperInfo {
  /** Javaファイルのuri */
  uri: string;
  /** 完全修飾名（package + interface名、例: com.example.mapper.UserMapper） */
  fullyQualifiedName: string;
  /** パッケージ名 */
  packageName: string;
  /** インターフェース名 */
  interfaceName: string;
  /** メソッド一覧 */
  methods: MethodLocation[];
}

/**
 * インデックスの状態
 */
export type IndexState = "uninitialized" | "initializing" | "ready";
