import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [html, base, editorCss, responsive, editor, model, uiShell, uiStructure, events, bootstrap, manifest] = await Promise.all([
  read("../index.html"),
  read("../v4/base.css"),
  read("../v4/editor.css"),
  read("../v4/responsive.css"),
  read("../editor.js"),
  read("../v4/model.js"),
  read("../v4/ui-shell.js"),
  read("../v4/ui-structure.js"),
  read("../v4/events.js"),
  read("../bootstrap.js"),
  read("../manifest.webmanifest"),
]);

const css = `${base}\n${editorCss}\n${responsive}`;
const ui = `${uiShell}\n${uiStructure}\n${events}`;

assert.match(html, /lang="ja"/u, "日本語文書として宣言する");
assert.match(html, /v4\/ui-shell\.js/u, "UI v4を既定画面として読み込む");
assert.doesNotMatch(html, /v3\/ui-shell\.js|\.\/ui\.js|\.\/styles\.css/u, "旧UIを既定画面へ読み込まない");
assert.match(editor, /insertSoftBreak/u, "Enterを段落内改行として処理する");
assert.match(editor, /event\.ctrlKey \|\| event\.metaKey/u, "CtrlまたはCmdとEnterで分割できる");
assert.match(editor, /splitNode\(nodeId/u, "明示操作で次の段落を作る");
assert.match(bootstrap, /Enter　段落内で改行/u, "画面上の案内も新しい入力規則に合わせる");
assert.match(model, /formatOutlineNumber/u, "論文型のアウトライン番号を生成する");
assert.match(ui, /sidebar-number/u, "アウトラインに番号を表示する");
assert.match(ui, /structure-number/u, "構成画面にも番号を表示する");
assert.match(ui, /memo-pane/u, "右側の常駐メモを実装する");
assert.match(ui, /toggle-memo/u, "メモをボタンで開閉できる");
assert.match(css, /grid-template-columns:\s*var\(--outline-column\)\s+minmax\(0, 1fr\)\s+var\(--memo-column\)/u, "アウトライン・本文・メモの三領域を定義する");
assert.match(css, /@media \(max-width: 1279px\)/u, "狭い画面ではメモをオーバーレイにする");
assert.match(css, /line-break:\s*strict/u, "日本語の基本的な禁則処理を有効にする");
assert.match(css, /prefers-reduced-motion/u, "動きを減らすOS設定を尊重する");
assert.equal(JSON.parse(manifest).display, "standalone", "インストール可能な表示形式を使う");

console.log("myspines UI v4 smoke checks passed");
