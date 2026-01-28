// @ts-check
const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * esbuildのビルドエラーをVS Codeの問題マッチャー形式で出力するプラグイン
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  // メイン拡張機能のビルド
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });

  // テストファイルのビルド
  const testCtx = await esbuild.context({
    entryPoints: ["src/test/**/*.ts"],
    bundle: true,
    format: "cjs",
    minify: false,
    sourcemap: true,
    sourcesContent: false,
    platform: "node",
    outdir: "dist/test",
    external: ["vscode", "mocha", "assert"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await Promise.all([ctx.watch(), testCtx.watch()]);
  } else {
    await Promise.all([ctx.rebuild(), testCtx.rebuild()]);
    await Promise.all([ctx.dispose(), testCtx.dispose()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
