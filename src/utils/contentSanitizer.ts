/**
 * コンテンツサニタイザー
 * コメント・CDATA・文字列リテラルの中身をスペースに置換し、
 * パーサーの誤検出を防ぐ前処理モジュール。
 *
 * 不変条件:
 * - sanitized.length === original.length
 * - 改行位置が完全に一致（行番号・列番号の計算に影響しない）
 */

/**
 * 文字列中の非改行文字をスペースに置換する共通ヘルパー
 */
function neutralizeContent(body: string): string {
  return body.replace(/[^\n]/g, " ");
}

/**
 * XML コンテンツのコメントとCDATAセクションの中身をサニタイズする
 * - `<!-- ... -->` のbody部分をスペースに置換
 * - `<![CDATA[ ... ]]>` のbody部分をスペースに置換
 * - デリミタ自体と改行は保持
 */
export function sanitizeXmlContent(content: string): string {
  return content.replace(
    /<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)\]\]>/g,
    (match, commentBody: string | undefined, cdataBody: string | undefined) => {
      if (commentBody !== undefined) {
        return `<!--${neutralizeContent(commentBody)}-->`;
      }
      if (cdataBody !== undefined) {
        return `<![CDATA[${neutralizeContent(cdataBody)}]]>`;
      }
      return match;
    }
  );
}

/**
 * Java コンテンツのコメントと文字列リテラルの中身をサニタイズする
 * - ブロックコメントのbody部分をスペースに置換
 * - `// ...` のbody部分をスペースに置換（改行まで）
 * - `"..."` の中身をスペースに置換（エスケープ対応）
 * - `'...'` の中身をスペースに置換（エスケープ対応）
 *
 * 1パスの文字走査ステートマシンで実装
 */
export function sanitizeJavaContent(content: string): string {
  const result: string[] = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    const ch = content[i];
    const next = i + 1 < len ? content[i + 1] : "";

    // ブロックコメント開始: /*
    if (ch === "/" && next === "*") {
      result.push("/", "*");
      i += 2;
      while (i < len) {
        if (content[i] === "*" && i + 1 < len && content[i + 1] === "/") {
          result.push("*", "/");
          i += 2;
          break;
        }
        result.push(content[i] === "\n" ? "\n" : " ");
        i++;
      }
      continue;
    }

    // 行コメント開始: //
    if (ch === "/" && next === "/") {
      result.push("/", "/");
      i += 2;
      while (i < len && content[i] !== "\n") {
        result.push(" ");
        i++;
      }
      continue;
    }

    // 文字列リテラル: "..."
    if (ch === '"') {
      result.push('"');
      i++;
      while (i < len && content[i] !== '"' && content[i] !== "\n") {
        if (content[i] === "\\" && i + 1 < len) {
          result.push(" ", " ");
          i += 2;
        } else {
          result.push(" ");
          i++;
        }
      }
      if (i < len && content[i] === '"') {
        result.push('"');
        i++;
      }
      continue;
    }

    // 文字リテラル: '...'
    if (ch === "'") {
      result.push("'");
      i++;
      while (i < len && content[i] !== "'" && content[i] !== "\n") {
        if (content[i] === "\\" && i + 1 < len) {
          result.push(" ", " ");
          i += 2;
        } else {
          result.push(" ");
          i++;
        }
      }
      if (i < len && content[i] === "'") {
        result.push("'");
        i++;
      }
      continue;
    }

    // 通常の文字: そのまま出力
    result.push(ch);
    i++;
  }

  return result.join("");
}
