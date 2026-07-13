import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [html, base, editorCss, responsive, density, refinementsCss, editor, model, modelRefinements, uiShell, uiStructure, refinements, events, version, bootstrap, manifest] = await Promise.all([
  read("../index.html"),
  read("../v4/base.css"),
  read("../v4/editor.css"),
  read("../v4/responsive.css"),
  read("../v4/density.css"),
  read("../v4/refinements.css"),
  read("../editor.js"),
  read("../v4/model.js"),
  read("../v4/model-refinements.js"),
  read("../v4/ui-shell.js"),
  read("../v4/ui-structure.js"),
  read("../v4/refinements.js"),
  read("../v4/events.js"),
  read("../v4/version.js"),
  read("../bootstrap.js"),
  read("../manifest.webmanifest"),
]);

const css = `${base}\n${editorCss}\n${responsive}\n${density}\n${refinementsCss}`;
const ui = `${uiShell}\n${uiStructure}\n${refinements}\n${events}\n${version}`;

assert.match(html, /lang="ja"/u, "日本語文書として宣言する");
assert.match(html, /v4\/ui-shell\.js/u, "UI v4を既定画面として読み込む");
assert.match(html, /v4\/density\.css/u, "高密度レイアウトを既定で読み込む");
assert.match(html, /v4\/refinements\.css/u, "簡素化した表示を最後に適用する");
assert.match(html, /v4\/model-refinements\.js/u, "見出し番号表示の設定を読み込む");
assert.match(html, /v4\/version\.js/u, "画面上のバージョンを最新へ統一する");
assert.doesNotMatch(html, /v3\/ui-shell\.js|\.\/ui\.js|\.\/styles\.css/u, "旧UIを既定画面へ読み込まない");
assert.match(editor, /insertSoftBreak/u, "Enterを段落内改行として処理する");
assert.match(editor, /event\.ctrlKey \|\| event\.metaKey/u, "CtrlまたはCmdとEnterで分割できる");
assert.match(editor, /splitNode\(nodeId/u, "明示操作で次の段落を作る");
assert.match(bootstrap, /Enter　段落内で改行/u, "画面上の案内も新しい入力規則に合わせる");
assert.match(model, /formatOutlineNumber/u, "論文型のアウトライン番号を生成する");
assert.match(model, /LAYOUT_DENSITY_VERSION/u, "既存原稿を実用密度へ一度だけ移行する");
assert.match(modelRefinements, /showHeadingNumbers/u, "本文見出し番号の表示設定を保存する");
assert.match(ui, /sidebar-number/u, "アウトラインに番号を表示する");
assert.match(ui, /structure-number/u, "構成画面にも番号を表示する");
assert.match(ui, /memo-pane/u, "右側の常駐メモを実装する");
assert.match(ui, /toggle-memo/u, "メモをボタンで開閉できる");
assert.match(refinements, /見出し番号/u, "本文上で見出し番号を切り替えられる");
assert.match(refinements, />操作<\/button>/u, "三点記号ではなく意味の読める操作ボタンを表示する");
assert.match(refinementsCss, /background:\s*transparent/u, "アウトラインの選択を色面で強調しない");
assert.match(refinementsCss, /text-align:\s*left/u, "アウトライン番号を左揃えにする");
assert.match(refinementsCss, /node-heading-number/u, "本文見出しにも番号を表示する");
assert.match(version, /myspines 0\.4\.2/u, "画面上のバージョンをpackageと一致させる");
assert.match(css, /grid-template-columns:\s*var\(--outline-column\)\s+minmax\(0, 1fr\)\s+var\(--memo-column\)/u, "アウトライン・本文・メモの三領域を定義する");
assert.match(density, /--measure:\s*46em/u, "本文の一行幅を実用的に広げる");
assert.match(density, /--body-leading:\s*1\.72/u, "行間を詰めて可視行数を増やす");
assert.match(css, /@media \(max-width: 1279px\)/u, "狭い画面ではメモをオーバーレイにする");
assert.match(css, /line-break:\s*strict/u, "日本語の基本的な禁則処理を有効にする");
assert.match(css, /prefers-reduced-motion/u, "動きを減らすOS設定を尊重する");
assert.equal(JSON.parse(manifest).display, "standalone", "インストール可能な表示形式を使う");

console.log("myspines UI v4 refined smoke checks passed");
