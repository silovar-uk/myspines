import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, core, commands, editor, transfer, manifest] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../core.js", import.meta.url), "utf8"),
  readFile(new URL("../commands.js", import.meta.url), "utf8"),
  readFile(new URL("../editor.js", import.meta.url), "utf8"),
  readFile(new URL("../transfer.js", import.meta.url), "utf8"),
  readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
]);

assert.match(html, /lang="ja"/u, "日本語文書として宣言する");
assert.match(html, /viewport-fit=cover/u, "モバイルのセーフエリアへ対応する");
assert.match(css, /line-break:\s*strict/u, "日本語の基本的な禁則処理を有効にする");
assert.match(css, /prefers-reduced-motion/u, "動きを減らすOS設定を尊重する");
assert.match(editor, /compositionstart/u, "IME変換開始を独立して扱う");
assert.match(editor, /insertParagraph/u, "段落分割をbeforeinputの編集意図で扱う");
assert.match(commands, /moveToLoose/u, "未配置への移動を実装する");
assert.match(transfer, /serializeAI/u, "AIへ渡す対象と文脈を区別する");
assert.match(core, /indexedDB/u, "原稿を端末内へ保存する");
assert.equal(JSON.parse(manifest).display, "standalone", "インストール可能な表示形式を使う");

console.log("myspines smoke checks passed");
