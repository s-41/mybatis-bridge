import * as assert from "assert";
import {
  sanitizeXmlContent,
  sanitizeJavaContent,
} from "../../utils/contentSanitizer";

suite("ContentSanitizer Test Suite", () => {
  suite("sanitizeXmlContent", () => {
    test("単一行XMLコメントをサニタイズ", () => {
      const input = `<!-- <select id="fake"> -->`;
      const result = sanitizeXmlContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(!result.includes("select"));
      assert.ok(!result.includes("fake"));
      assert.ok(result.startsWith("<!--"));
      assert.ok(result.endsWith("-->"));
    });

    test("複数行XMLコメントをサニタイズ", () => {
      const input = `<!--\n<select id="fake">\nSELECT * FROM users\n-->`;
      const result = sanitizeXmlContent(input);
      assert.strictEqual(result.length, input.length);
      // 改行は保持される
      assert.strictEqual(
        (result.match(/\n/g) || []).length,
        (input.match(/\n/g) || []).length
      );
      assert.ok(!result.includes("select"));
      assert.ok(!result.includes("fake"));
    });

    test("CDATAセクションをサニタイズ", () => {
      const input = `<![CDATA[<select id="fake">]]>`;
      const result = sanitizeXmlContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(!result.includes("select"));
      assert.ok(!result.includes("fake"));
      assert.ok(result.startsWith("<![CDATA["));
      assert.ok(result.endsWith("]]>"));
    });

    test("コメント外のコンテンツは変更されない", () => {
      const input = `<select id="findById" resultType="User">
  SELECT * FROM users WHERE id = #{id}
</select>`;
      const result = sanitizeXmlContent(input);
      assert.strictEqual(result, input);
    });

    test("コメントと通常コンテンツの混在", () => {
      const input = `<!-- コメント -->
<select id="findById" resultType="User">
  SELECT * FROM users
</select>
<!-- <delete id="fake"> -->`;
      const result = sanitizeXmlContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(result.includes(`<select id="findById"`));
      assert.ok(!result.includes("fake"));
    });
  });

  suite("sanitizeJavaContent", () => {
    test("ブロックコメント（単一行）をサニタイズ", () => {
      const input = `/* User findById(Long id); */`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(!result.includes("findById"));
      assert.ok(result.startsWith("/*"));
      assert.ok(result.endsWith("*/"));
    });

    test("ブロックコメント（複数行）をサニタイズ", () => {
      const input = `/*\n * User findById(Long id);\n * List<User> findAll();\n */`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      assert.strictEqual(
        (result.match(/\n/g) || []).length,
        (input.match(/\n/g) || []).length
      );
      assert.ok(!result.includes("findById"));
      assert.ok(!result.includes("findAll"));
    });

    test("行コメントをサニタイズ", () => {
      const input = `// User findById(Long id);`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(!result.includes("findById"));
      assert.ok(result.startsWith("//"));
    });

    test("行コメントの後に改行がある場合", () => {
      const input = `// comment\nUser findById(Long id);`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(result.includes("findById"));
      assert.ok(result.includes("\n"));
    });

    test("文字列リテラルをサニタイズ", () => {
      const input = `String s = "User findById(Long id);";`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      // 文字列の外にある "String" と "s" は保持される
      assert.ok(result.startsWith("String s = "));
      // 文字列内の "findById" はサニタイズされる
      assert.ok(!result.includes("findById"));
    });

    test("エスケープ付き文字列リテラルをサニタイズ", () => {
      const input = `String s = "hello \\"world\\"";`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
    });

    test("文字リテラルをサニタイズ", () => {
      const input = `char c = 'a';`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      assert.ok(result.startsWith("char c = '"));
    });

    test("エスケープ付き文字リテラルをサニタイズ", () => {
      const input = `char c = '\\n';`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
    });

    test("コメント外のコンテンツは変更されない", () => {
      const input = `package com.example.mapper;

public interface UserMapper {
    User findById(Long id);
}`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result, input);
    });

    test("混在パターン（コメント + 通常コード + 文字列）", () => {
      const input = `package com.example;
/* コメント内のinterface Fake {} */
public interface UserMapper {
    // User fakeMethod();
    User findById(Long id);
    String query = "interface FakeMapper {}";
}`;
      const result = sanitizeJavaContent(input);
      assert.strictEqual(result.length, input.length);
      // 通常のコードは保持
      assert.ok(result.includes("public interface UserMapper"));
      assert.ok(result.includes("User findById(Long id);"));
      // コメント内・文字列内はサニタイズ
      assert.ok(!result.includes("fakeMethod"));
      assert.ok(!result.includes("FakeMapper"));
      assert.ok(!result.includes("Fake {}"));
    });
  });

  suite("長さ保持の不変条件", () => {
    const testCases = [
      { name: "XMLコメント", input: `<!-- test -->`, fn: sanitizeXmlContent },
      {
        name: "CDATA",
        input: `<![CDATA[test]]>`,
        fn: sanitizeXmlContent,
      },
      {
        name: "ブロックコメント",
        input: `/* test */`,
        fn: sanitizeJavaContent,
      },
      { name: "行コメント", input: `// test`, fn: sanitizeJavaContent },
      { name: "文字列リテラル", input: `"test"`, fn: sanitizeJavaContent },
      { name: "文字リテラル", input: `'t'`, fn: sanitizeJavaContent },
      {
        name: "複数行XMLコメント",
        input: `<!--\nline1\nline2\n-->`,
        fn: sanitizeXmlContent,
      },
      {
        name: "複数行ブロックコメント",
        input: `/*\nline1\nline2\n*/`,
        fn: sanitizeJavaContent,
      },
    ];

    for (const { name, input, fn } of testCases) {
      test(`${name}: 長さが保持される`, () => {
        const result = fn(input);
        assert.strictEqual(result.length, input.length);
      });
    }
  });

  suite("改行位置保持テスト", () => {
    test("XMLコメントの改行位置が保持される", () => {
      const input = `line1\n<!-- \ncomment\n -->\nline3`;
      const result = sanitizeXmlContent(input);
      const inputNewlines = [...input].reduce(
        (acc, ch, i) => (ch === "\n" ? [...acc, i] : acc),
        [] as number[]
      );
      const resultNewlines = [...result].reduce(
        (acc, ch, i) => (ch === "\n" ? [...acc, i] : acc),
        [] as number[]
      );
      assert.deepStrictEqual(resultNewlines, inputNewlines);
    });

    test("Javaコメントの改行位置が保持される", () => {
      const input = `line1\n/*\ncomment\n*/\nline3`;
      const result = sanitizeJavaContent(input);
      const inputNewlines = [...input].reduce(
        (acc, ch, i) => (ch === "\n" ? [...acc, i] : acc),
        [] as number[]
      );
      const resultNewlines = [...result].reduce(
        (acc, ch, i) => (ch === "\n" ? [...acc, i] : acc),
        [] as number[]
      );
      assert.deepStrictEqual(resultNewlines, inputNewlines);
    });
  });
});
