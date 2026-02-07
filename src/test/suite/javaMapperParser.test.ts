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

    test("ブロックコメント内のメソッドシグネチャを無視する", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    /* User fakeMethod(Long id); */
    User findById(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
    });

    test("行コメント内のメソッドシグネチャを無視する", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    // User fakeMethod(Long id);
    User findById(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
    });

    test("複数行ブロックコメント内のメソッドシグネチャを無視する", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    /*
     * User fakeMethod1(Long id);
     * List<User> fakeMethod2();
     */
    User findById(Long id);
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findById");
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

    test("複数行メソッドシグネチャを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    List<User> findByCondition(
        @Param("name") String name,
        @Param("age") Integer age
    );
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findByCondition");
      // メソッド名は3行目（0-based）にある
      assert.strictEqual(methods[0].line, 3);
    });

    test("複数行メソッドシグネチャ + throws句", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findByNameAndAge(
        @Param("name") String name,
        @Param("age") Integer age
    ) throws DataAccessException;
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 1);
      assert.strictEqual(methods[0].name, "findByNameAndAge");
    });

    test("配列型戻り値を持つメソッドを抽出", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User[] findAll();
    byte[] getAvatar(Long id);
    int[] getIds();
}`;
      const methods = extractMethods(content);
      assert.strictEqual(methods.length, 3);
      assert.deepStrictEqual(
        methods.map((m) => m.name),
        ["findAll", "getAvatar", "getIds"]
      );
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

    test("アノテーション付きインターフェースならtrue", () => {
      const content = `package com.example;
@Mapper
public interface UserMapper {}`;
      assert.strictEqual(isMapperInterface(content), true);
    });

    test("引数付きアノテーション付きインターフェースならtrue", () => {
      const content = `package com.example;
@Repository("name")
public interface UserMapper {}`;
      assert.strictEqual(isMapperInterface(content), true);
    });

    test("同一行のアノテーション付きインターフェースならtrue", () => {
      const content = `package com.example;
@Mapper public interface UserMapper {}`;
      assert.strictEqual(isMapperInterface(content), true);
    });

    test("抽象クラスならtrue", () => {
      const content = `package com.example;
public abstract class BaseMapper {}`;
      assert.strictEqual(isMapperInterface(content), true);
    });

    test("通常のクラスは引き続きfalse（回帰テスト）", () => {
      const content = `package com.example;
public class UserService {}`;
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

    test("オーバーロードメソッドは最初の定義を保持する", () => {
      const content = `package com.example.mapper;

public interface UserMapper {
    User findById(Long id);
    User findById(Long id, boolean includeDeleted);
}`;
      const result = parseJavaMapper("file:///UserMapper.java", content);
      assert.notStrictEqual(result, null);
      // methodsには全メソッドが含まれる
      assert.strictEqual(result!.methods.length, 2);
      // methodMapは最初の定義を保持
      const method = result!.methodMap.get("findById");
      assert.notStrictEqual(method, undefined);
      assert.strictEqual(method!.line, 3); // 最初の定義の行
    });

    test("アノテーション付きインターフェースをパース", () => {
      const content = `package com.example.mapper;

@Mapper
public interface UserMapper {
    User findById(Long id);
}`;
      const result = parseJavaMapper("file:///UserMapper.java", content);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.interfaceName, "UserMapper");
      assert.strictEqual(result?.methods.length, 1);
    });

    test("抽象クラスMapperをパース", () => {
      const content = `package com.example.mapper;

public abstract class BaseMapper {
    User findById(Long id);
}`;
      const result = parseJavaMapper("file:///BaseMapper.java", content);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.interfaceName, "BaseMapper");
      assert.strictEqual(result?.methods.length, 1);
    });
  });
});
