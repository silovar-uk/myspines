import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [html, base, editorCss, responsive, core, commands, editor, uiShell, uiStructure, transfer, manifest] = await Promise.all([
  read("../index.html"),
  read("../v2/base.css"),
  read("../v2/editor.css"),
  read("../v2/responsive.css"),
  read("../core.js"),
  read("../commands.js"),
  read("../editor.js"),
  read("../v2/ui-shell.js"),
  read("../v2/ui-structure.js"),
  read("../v2/transfer-copy.js"),
  read("../manifest.webmanifest"),
]);

const css = `${base}\n${editorCss}\n${responsive}`;
const ui = `${uiShell}\n${uiStructure}`;

assert.match(html, /lang="ja"/u, "日本語文書として宣言する");
assert.match(html, /v2\/ui-shell\.js/u, "UI v2を既定画面として読み込む");
assert.doesNotMatch(html, /\.\/ui\.js|\.\/styles\.css/u, "旧UIを既定画面へ読み込まない");
assert.match(css, /line-break:\s*strict/u, "日本語の基本的な禁則処理を有効にする");
assert.match(css, /prefers-reduced-motion/u, "動きを減らすOS設定を尊重する");
assert.match(css, /\.write-layout/u, "本文とアウトラインの配置を定義する");
assert.match(css, /grid-template-columns:\s*repeat\(3,\s*1fr\)/u, "スマホの主要画面を本文・構成・メモの三つに絞る");
assert.match(editor, /compositionstart/u, "IME変換開始を独立して扱う");
assert.match(editor, /insertParagraph/u, "段落分割をbeforeinputの編集意図で扱う");
assert.match(commands, /moveToLoose/u, "未配置への移動を実装する");
assert.match(transfer, /serializeAI/u, "AIへ渡す対象と文脈を区別する");
assert.match(core, /indexedDB/u, "原稿を端末内へ保存する");
assert.match(ui, />本文<\/button>/u, "主要モードを本文と表示する");
assert.match(ui, />構成<\/button>/u, "主要モードを構成と表示する");
assert.match(ui, /アウトライン/u, "本文画面から構造を確認できる");
assert.match(ui, /書き出し/u, "出口を初見で発見できる");
assert.doesNotMatch(ui, />WRITE<\/button>|>SHAPE<\/button>|>Spine<|>Margin</u, "内部概念名を主要UIへ露出しない");
assert.equal(JSON.parse(manifest).display, "standalone", "インストール可能な表示形式を使う");

console.log("myspines UI v2 smoke checks passed");
