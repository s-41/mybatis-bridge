import * as assert from "assert";
import {
  isMyBatisXml,
  extractNamespace,
  extractStatements,
  parseXmlMapper,
  getIdAtPosition,
} from "../../services/XmlMapperParser";

suite("XmlMapperParser Test Suite", () => {
  suite("isMyBatisXml", () => {
    test("DOCTYPE宣言があればMyBatis XMLと判定", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
</mapper>`;
      assert.strictEqual(isMyBatisXml(content), true);
    });

    test("mapper namespace属性があればMyBatis XMLと判定", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
</mapper>`;
      assert.strictEqual(isMyBatisXml(content), true);
    });

    test("通常のXMLファイルはMyBatis XMLではない", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <setting name="value"/>
</config>`;
      assert.strictEqual(isMyBatisXml(content), false);
    });
  });

  suite("extractNamespace", () => {
    test("namespaceを正しく抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
</mapper>`;
      assert.strictEqual(
        extractNamespace(content),
        "com.example.mapper.UserMapper"
      );
    });

    test("シングルクォートでもnamespaceを抽出", () => {
      const content = `<mapper namespace='com.example.mapper.UserMapper'>
</mapper>`;
      assert.strictEqual(
        extractNamespace(content),
        "com.example.mapper.UserMapper"
      );
    });

    test("namespaceがない場合はnullを返す", () => {
      const content = `<mapper>
</mapper>`;
      assert.strictEqual(extractNamespace(content), null);
    });
  });

  suite("extractStatements", () => {
    test("select文を抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select id="findById" resultType="User">
    SELECT * FROM users WHERE id = #{id}
  </select>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 1);
      assert.strictEqual(statements[0].id, "findById");
      assert.strictEqual(statements[0].type, "select");
      assert.strictEqual(statements[0].line, 1);
    });

    test("複数のstatementを抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select id="findAll" resultType="User">SELECT * FROM users</select>
  <insert id="insert">INSERT INTO users (name) VALUES (#{name})</insert>
  <update id="update">UPDATE users SET name = #{name} WHERE id = #{id}</update>
  <delete id="delete">DELETE FROM users WHERE id = #{id}</delete>
  <resultMap id="userResultMap" type="User"></resultMap>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 5);
      assert.deepStrictEqual(
        statements.map((s) => s.id),
        ["findAll", "insert", "update", "delete", "userResultMap"]
      );
      assert.deepStrictEqual(
        statements.map((s) => s.type),
        ["select", "insert", "update", "delete", "resultMap"]
      );
    });

    test("複数行にまたがるタグ定義を抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select
      id="findById"
      resultType="User">
    SELECT * FROM users WHERE id = #{id}
  </select>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 1);
      assert.strictEqual(statements[0].id, "findById");
      assert.strictEqual(statements[0].type, "select");
      // タグの開始行（<selectの行）
      assert.strictEqual(statements[0].line, 1);
    });

    test("1行タグと複数行タグの混在を抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select id="findAll" resultType="User">SELECT * FROM users</select>
  <insert
      id="insertUser"
      parameterType="User">
    INSERT INTO users (name) VALUES (#{name})
  </insert>
  <update id="updateUser">UPDATE users SET name = #{name}</update>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 3);
      assert.deepStrictEqual(
        statements.map((s) => s.id),
        ["findAll", "insertUser", "updateUser"]
      );
      assert.deepStrictEqual(
        statements.map((s) => s.type),
        ["select", "insert", "update"]
      );
    });

    test("XMLコメント内のstatementパターンを無視する", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <!-- <select id="commentedOut" resultType="User">
    SELECT * FROM users
  </select> -->
  <select id="findById" resultType="User">
    SELECT * FROM users WHERE id = #{id}
  </select>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 1);
      assert.strictEqual(statements[0].id, "findById");
    });

    test("CDATAセクション内のXMLパターンを無視する", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select id="findById" resultType="User">
    <![CDATA[
      <select id="fakeInCdata">
      SELECT * FROM users WHERE age > 10 AND age < 20
    ]]>
  </select>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 1);
      assert.strictEqual(statements[0].id, "findById");
    });

    test("複数のコメントが混在するケース", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <!-- <insert id="fakeInsert"> -->
  <select id="findAll" resultType="User">SELECT * FROM users</select>
  <!-- <delete id="fakeDelete"> -->
  <insert id="insert">INSERT INTO users (name) VALUES (#{name})</insert>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 2);
      assert.deepStrictEqual(
        statements.map((s) => s.id),
        ["findAll", "insert"]
      );
    });

    test("id属性が先頭以外の位置にある複数行タグを抽出", () => {
      const content = `<mapper namespace="com.example.mapper.UserMapper">
  <select
      resultType="User"
      id="findByName"
      parameterType="String">
    SELECT * FROM users WHERE name = #{name}
  </select>
</mapper>`;
      const statements = extractStatements(content);
      assert.strictEqual(statements.length, 1);
      assert.strictEqual(statements[0].id, "findByName");
      assert.strictEqual(statements[0].type, "select");
    });
  });

  suite("parseXmlMapper", () => {
    test("有効なMyBatis XMLをパース", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
  <select id="findById" resultType="User">
    SELECT * FROM users WHERE id = #{id}
  </select>
</mapper>`;
      const result = parseXmlMapper("file:///test.xml", content);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.namespace, "com.example.mapper.UserMapper");
      assert.strictEqual(result?.uri, "file:///test.xml");
      assert.strictEqual(result?.statements.length, 1);
    });

    test("MyBatis XMLでない場合はnullを返す", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<config><setting/></config>`;
      const result = parseXmlMapper("file:///test.xml", content);
      assert.strictEqual(result, null);
    });
  });

  suite("getIdAtPosition", () => {
    test("id属性値上でidを返す", () => {
      const content = `  <select id="findById" resultType="User">`;
      // "findById" は column 14-21 の位置
      assert.strictEqual(getIdAtPosition(content, 0, 14), "findById");
      assert.strictEqual(getIdAtPosition(content, 0, 17), "findById");
      assert.strictEqual(getIdAtPosition(content, 0, 21), "findById");
    });

    test("id属性値外ではnullを返す", () => {
      const content = `  <select id="findById" resultType="User">`;
      // "select" タグ名の位置
      assert.strictEqual(getIdAtPosition(content, 0, 3), null);
      // "resultType" 属性の位置
      assert.strictEqual(getIdAtPosition(content, 0, 30), null);
    });
  });
});
