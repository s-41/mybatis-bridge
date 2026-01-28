import * as assert from "assert";
import {
  extractPackageName,
  extractInterfaceName,
  extractMethods,
  parseJavaMapper,
  isMapperInterface,
} from "../../services/JavaMapperParser";

suite("JavaMapperParser Test Suite", () => {
  suite("extractPackageName", () => {
    test("パッケージ名を正しく抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
}`;
      assert.strictEqual(extractPackageName(content), "com.example.mapper");
    });

    test("サブパッケージも正しく抽出", () => {
      const content = `package com.example.project.dao.mapper;

interface UserMapper {}`;
      assert.strictEqual(
        extractPackageName(content),
        "com.example.project.dao.mapper"
      );
    });

    test("パッケージ宣言がない場合はnullを返す", () => {
      const content = `public interface UserMapper {}`;
      assert.strictEqual(extractPackageName(content), null);
    });
  });

  suite("extractInterfaceName", () => {
    test("インターフェース名を正しく抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
}`;
      assert.strictEqual(extractInterfaceName(content), "UserMapper");
    });

    test("publicなしのインターフェースも抽出", () => {
      const content = `package com.example.mapper;

interface InternalMapper {
}`;
      assert.strictEqual(extractInterfaceName(content), "InternalMapper");
    });

    test("クラスの場合はnullを返す（インターフェースでない）", () => {
      const content = `package com.example.mapper;

public class UserMapperImpl {
}`;
      assert.strictEqual(extractInterfaceName(content), null);
    });
  });

  suite("extractMethods", () => {
    test("シンプルなメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findById(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
    });

    test("複数のメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findById(Long id);
    List<User> findAll();
    void insert(User user);
    int update(User user);
    int delete(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 5);
      assert.deepStrictEqual(
        methods.map((m) => m.name),
        ["findById", "findAll", "insert", "update", "delete"]
      );
    });

    test("ジェネリクス戻り値を持つメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    Map<String, Object> findByCondition(Map<String, Object> params);
    List<User> findAll();
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 2);
      assert.strictEqual(methods[0].name, "findByCondition");
      assert.strictEqual(methods[1].name, "findAll");
    });

    test("アノテーション付きメソッドの行位置", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
      // メソッド宣言は5行目（0-based で4）
      assert.strictEqual(methods[0].line, 4);
    });

    test("@Param アノテーション付き引数のメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    Optional<User> findByEmail(@Param("email") String email);
    Optional<User> findById(@Param("id") Long id);
    void deleteById(@Param("id") Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 3);
      assert.deepStrictEqual(
        methods.map((m) => m.name),
        ["findByEmail", "findById", "deleteById"]
      );
    });

    test("複数の@Param引数を持つメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    void updateUser(@Param("id") Long id, @Param("name") String name);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "updateUser");
    });

    test("@Paramとthrows句を含むメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findById(@Param("id") Long id) throws SQLException;
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
    });
  });

  suite("isMapperInterface", () => {
    test("インターフェースならtrue", () => {
      const content = `package com.example;
public interface UserMapper {}`;
      assert.strictEqual(isMapperInterface(content), true);
    });

    test("クラスならfalse", () => {
      const content = `package com.example;
public class UserMapperImpl {}`;
      assert.strictEqual(isMapperInterface(content), false);
    });
  });

  suite("parseJavaMapper", () => {
    test("有効なMapperインターフェースをパース", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findById(Long id);
    List<User> findAll();
}`;
      const result = parseJavaMapper("file:///UserMapper.java", content);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.packageName, "com.example.mapper");
      assert.strictEqual(result?.interfaceName, "UserMapper");
      assert.strictEqual(
        result?.fullyQualifiedName,
        "com.example.mapper.UserMapper"
      );
      assert.strictEqual(result?.methods.length, 2);
    });

    test("クラスの場合はnullを返す", () => {
      const content = `package com.example.mapper;

public class UserMapperImpl {
    public User findById(Long id) { return null; }
}`;
      const result = parseJavaMapper("file:///UserMapperImpl.java", content);
      assert.strictEqual(result, null);
    });

    test("パッケージがない場合はnullを返す", () => {
      const content = `public interface UserMapper {
    User findById(Long id);
}`;
      const result = parseJavaMapper("file:///UserMapper.java", content);
      assert.strictEqual(result, null);
    });
  });
});
