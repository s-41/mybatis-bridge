---
name: release
description: VS Code拡張機能のリリース作業を実行する。バージョンバンプ、ビルド、パッケージング、パブリッシュ、GitHub Release作成までの一連のリリースフローを対話的に実行する
argument-hint: "[patch|minor|major]"
disable-model-invocation: true
---

VS Code拡張機能のリリースを実行する。バンプレベル: $ARGUMENTS

## 引数の解釈

- `patch` / `minor` / `major`: セマンティックバージョニングのバンプレベル
- 引数なしまたは上記以外の場合は、必ずユーザーに `patch` / `minor` / `major` のどれにするか尋ねてから進める

## 手順

### 1. 事前チェック

1. 現在のブランチが `main` であることを確認する。mainでなければエラーを伝えて終了
2. `git status` でワーキングツリーがクリーンであることを確認する。未コミットの変更があればエラーを伝えて終了
3. `git pull --rebase` でmainを最新化する

### 2. ビルド・テストの実行

1. `pnpm install` で依存関係を最新化
2. `pnpm run compile` でビルド（型チェック + lint + esbuild）を実行
3. ビルドが失敗したらエラーを伝えて終了

### 3. バージョン更新

1. 現在の `package.json` の `version` を読み取って表示する
2. 指定されたバンプレベル（patch/minor/major）に基づいて新しいバージョン番号を計算する
3. `npm version <patch|minor|major> --no-git-tag-version` でバージョンを更新する
4. 新しいバージョン番号をユーザーに表示し、続行してよいか確認する

### 4. CHANGELOG更新の確認

1. `CHANGELOG.md` が存在する場合、ユーザーに「CHANGELOGの更新は必要ですか？」と確認する
2. 必要であればユーザーの指示に従って更新する
3. 存在しない場合はスキップ

### 5. リリースコミットの作成

CLAUDE.mdのGit運用ルールに従い、mainへの直接コミットは行わない:

1. `git switch -c chore/release-v<新バージョン>` でブランチを作成
2. 変更されたファイル（package.json、CHANGELOG.mdなど）をステージングする
3. 以下の形式でコミットを作成する:
   ```
   chore(release): v<新バージョン>リリース準備
   ```
4. `git push -u origin chore/release-v<新バージョン>` でリモートにプッシュ

### 6. パッケージング

1. `pnpm run package` で本番用ビルドを実行
2. `vsce package` で `.vsix` ファイルを生成する
3. 生成されたファイル名を表示する

### 7. パブリッシュ

1. ユーザーに「Marketplaceにパブリッシュしますか？」と確認する
2. 承認された場合のみ `vsce publish` を実行する
3. 拒否された場合は「`.vsix` ファイルを手動でアップロードできます」と案内して終了

### 8. GitHub Release の作成

1. ユーザーに「GitHub Releaseを作成しますか？」と確認する
2. 承認された場合:
   - PRを作成する: `gh pr create --title "[chore] v<新バージョン>リリース準備" --body "..."`
   - PRのURLを表示し、マージ後に以下を実行するよう案内する:
     - `git tag v<新バージョン>` でタグを作成
     - `git push origin v<新バージョン>` でタグをプッシュ
     - `gh release create v<新バージョン> --title "v<新バージョン>" --generate-notes` でリリースを作成

### 9. 完了報告

以下の情報をまとめて表示する:
- リリースしたバージョン
- 実行した内容のサマリー
- 残りの手動作業（PRマージ、タグ作成など）があれば一覧表示
