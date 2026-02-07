import * as assert from "assert";
import {
  buildImportMap,
  extractMapperFields,
  extractMapperCalls,
} from "../../services/MapperUsageParser";

suite("MapperUsageParser Test Suite", () => {
  suite("buildImportMap", () => {
    test("基本的なimport解析", () => {
      const content = `import com.example.mapper.UserMapper;
import com.example.mapper.OrderMapper;
import java.util.List;`;
      const importMap = buildImportMap(content);
      assert.strictEqual(importMap.get("UserMapper"), "com.example.mapper.UserMapper");
      assert.strictEqual(importMap.get("OrderMapper"), "com.example.mapper.OrderMapper");
      assert.strictEqual(importMap.get("List"), "java.util.List");
    });

    test("ワイルドカードimportを無視する", () => {
      const content = `import com.example.mapper.*;
import java.util.List;`;
      const importMap = buildImportMap(content);
      assert.strictEqual(importMap.has("*"), false);
      assert.strictEqual(importMap.get("List"), "java.util.List");
    });
  });

  suite("extractMapperFields", () => {
    test("フィールドを正しく検出する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    @Autowired
    private UserMapper userMapper;
}`;
      const importMap = buildImportMap(content);
      const knownFqns = new Set(["com.example.mapper.UserMapper"]);
      const fields = extractMapperFields(content, importMap, knownFqns);
      assert.strictEqual(fields.length, 1);
      assert.strictEqual(fields[0].fieldName, "userMapper");
      assert.strictEqual(fields[0].mapperType, "UserMapper");
      assert.strictEqual(fields[0].mapperFqn, "com.example.mapper.UserMapper");
    });

    test("メソッドパラメータ経由のMapper変数を検出する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    public void execute(UserMapper userMapper) {
        userMapper.findById(1L);
    }
}`;
      const importMap = buildImportMap(content);
      const knownFqns = new Set(["com.example.mapper.UserMapper"]);
      const fields = extractMapperFields(content, importMap, knownFqns);
      assert.strictEqual(fields.length, 1);
      assert.strictEqual(fields[0].fieldName, "userMapper");
      assert.strictEqual(fields[0].mapperType, "UserMapper");
      assert.strictEqual(fields[0].mapperFqn, "com.example.mapper.UserMapper");
    });

    test("フィールド宣言とパラメータの重複排除", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    private UserMapper userMapper;

    public void execute(UserMapper userMapper) {
        userMapper.findById(1L);
    }
}`;
      const importMap = buildImportMap(content);
      const knownFqns = new Set(["com.example.mapper.UserMapper"]);
      const fields = extractMapperFields(content, importMap, knownFqns);
      // フィールド宣言が先に検出され、パラメータは重複排除される
      assert.strictEqual(fields.length, 1);
      assert.strictEqual(fields[0].fieldName, "userMapper");
    });

    test("コメント内のフィールド宣言を無視する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    /* private UserMapper fakeMapper; */
    // private UserMapper anotherFake;
    @Autowired
    private UserMapper userMapper;
}`;
      const importMap = buildImportMap(content);
      const knownFqns = new Set(["com.example.mapper.UserMapper"]);
      const fields = extractMapperFields(content, importMap, knownFqns);
      assert.strictEqual(fields.length, 1);
      assert.strictEqual(fields[0].fieldName, "userMapper");
    });
  });

  suite("extractMapperCalls", () => {
    test("メソッド呼び出しを正しく検出する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    private UserMapper userMapper;

    public User getUser(Long id) {
        return userMapper.findById(id);
    }
}`;
      const fields = [
        {
          fieldName: "userMapper",
          mapperType: "UserMapper",
          mapperFqn: "com.example.mapper.UserMapper",
          line: 3,
        },
      ];
      const calls = extractMapperCalls(content, fields);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].fieldName, "userMapper");
      assert.strictEqual(calls[0].methodName, "findById");
    });

    test("文字列リテラル内のパターンを無視する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    private UserMapper userMapper;

    public void logInfo() {
        String msg = "userMapper.findById(id)";
        userMapper.findAll();
    }
}`;
      const fields = [
        {
          fieldName: "userMapper",
          mapperType: "UserMapper",
          mapperFqn: "com.example.mapper.UserMapper",
          line: 3,
        },
      ];
      const calls = extractMapperCalls(content, fields);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].methodName, "findAll");
    });

    test("パラメータ経由のMapper呼び出しを検出する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    public void execute(UserMapper userMapper) {
        userMapper.findById(1L);
    }
}`;
      const importMap = buildImportMap(content);
      const knownFqns = new Set(["com.example.mapper.UserMapper"]);
      const fields = extractMapperFields(content, importMap, knownFqns);
      const calls = extractMapperCalls(content, fields);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].fieldName, "userMapper");
      assert.strictEqual(calls[0].methodName, "findById");
      assert.strictEqual(calls[0].mapperFqn, "com.example.mapper.UserMapper");
    });

    test("コメント内のメソッド呼び出しを無視する", () => {
      const content = `import com.example.mapper.UserMapper;

public class UserService {
    private UserMapper userMapper;

    public void doSomething() {
        // userMapper.fakeCall(id);
        /* userMapper.anotherFake(id); */
        userMapper.realCall();
    }
}`;
      const fields = [
        {
          fieldName: "userMapper",
          mapperType: "UserMapper",
          mapperFqn: "com.example.mapper.UserMapper",
          line: 3,
        },
      ];
      const calls = extractMapperCalls(content, fields);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].methodName, "realCall");
    });
  });
});
