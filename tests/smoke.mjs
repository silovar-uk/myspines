import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [html, base, editorCss, responsive, model, uiShell, uiStructure, events, editor, commands, transfer, manifest] = await Promise.all([
  read("../index.html"),
  read("../v3/base.css"),
  read("../v3/editor.css"),
  read("../v3/responsive.css"),
  read("../v3/model.js"),
  read("../v3/ui-shell.js"),
  read("../v3/ui-structure.js"),
  read("../v3/events.js"),
  read("../editor.js"),
  read("../commands.js"),
  read("../v2/transfer-copy.js"),
  read("../manifest.webmanifest"),
]);

const css = `${base}\n${editorCss}\n${responsive}`;
const ui = `${uiShell}\n${uiStructure}`;

assert.match(html, /lang="ja"/u, "日本語文書として宣言する");
assert.match(html, /v3\/ui-shell\.js/u, "UI v3を既定画面として読み込む");
assert.doesNotMatch(html, /\.\/v2\/ui-shell\.js|\.\/styles\.css/u, "旧UIを既定画面へ読み込まない");
assert.match(css, /grid-template-columns:\s*var\(--outline-width\)\s+minmax\(0,\s*1fr\)/u, "アウトラインと本文を隙間のないSplit Viewにする");
assert.match(css, /--measure:\s*40em/u, "本文幅を安定させる");
assert.match(css, /@media \(max-width: 1039px\) and \(min-width: 760px\)/u, "タブレットでアウトラインをオーバーレイ化する");
assert.match(css, /\.outline-resizer/u, "アウトライン幅のリサイズ操作を用意する");
assert.match(css, /\.paragraph-sheet/u, "スマホの段落操作を下部シートへ置く");
assert.match(css, /line-break:\s*strict/u, "日本語の基本禁則を維持する");
assert.match(css, /prefers-reduced-motion/u, "動きを減らす設定を尊重する");
assert.match(css, /grid-template-columns:\s*repeat\(3,\s*1fr\)/u, "スマホの主要画面を本文・構成・メモの三つにする");
assert.match(uiShell, /document-axis/u, "タイトル・現在地・本文を同じ軸へ揃える");
assert.match(uiStructure, /structure-table-header/u, "構成画面を本文アウトラインと異なる表形式にする");
assert.match(uiStructure, /本文冒頭/u, "構成画面で本文冒頭を比較できる");
assert.match(events, /toggleOutlineMetrics/u, "アウトラインの文字数密度を切り替えられる");
assert.match(model, /outlineWidth:\s*288/u, "アウトライン幅の初期値を保存する");
assert.match(model, /outlineMetrics:\s*false/u, "下位文字数を初期状態で抑える");
assert.match(editor, /compositionstart/u, "IME変換開始を独立して扱う");
assert.match(editor, /insertParagraph/u, "段落分割をbeforeinputの編集意図で扱う");
assert.match(commands, /moveToLoose/u, "未配置への移動を実装する");
assert.match(transfer, /serializeAI/u, "AIへ渡す対象と文脈を区別する");
assert.match(ui, />本文<\/button>/u, "主要モードを本文と表示する");
assert.match(ui, />構成<\/button>/u, "主要モードを構成と表示する");
assert.equal(JSON.parse(manifest).display, "standalone", "インストール可能な表示形式を使う");

console.log("myspines UI v3 smoke checks passed");
