# myspines

> 本の背骨を、急かさず育てる静かな編集机。

myspinesは、段落を動かしながら本の構造を育てる、ローカルファーストの長文執筆ツールです。
単なるアウトライナーではなく、本文を書く時間と、構造を組み替える時間を行き来するために作っています。

## 現在の実装

- **WRITE / SHAPE**
  - WRITEでは本文へ集中
  - SHAPEでは本全体の階層、順番、文字量を確認
- **EXPLORE / REFINE**
  - 「ひろげる」「ととのえる」の作業レンズ
- **階層編集**
  - `Enter`で段落分割
  - `Shift + Enter`で段落内改行
  - `Tab / Shift + Tab`で階層変更
  - `Alt + Shift + ↑ / ↓`で上下移動
- **集中表示と折り畳み**
- **Margin**
  - 本全体と現在の段落に、本文外のメモを保存
  - 次回へ戻るための「次の糸口」
- **未配置**
  - まだ本の中の居場所を決めない断片を退避
- **AIとの往復**
  - 選択範囲、段落、部分木、本全体をコピー
  - 本文のみ、見出し付き、Markdown、AI用の形式
- **取り込みと書き出し**
  - プレーンテキスト、Markdown、myspines JSON
  - Markdown、テキスト、完全JSONの書き出し
- **端末内保存**
  - IndexedDBへ自動保存
  - アカウント、クラウド同期、外部送信なし
- **PWA**
  - アプリシェルをオフライン利用可能

## 使い始める

GitHub Pages:

`https://silovar-uk.github.io/myspines/`

ローカルでは、静的ファイルサーバーでリポジトリ直下を開きます。

```bash
python -m http.server 4173
```

その後、`http://localhost:4173`を開きます。

## ショートカット

| 操作 | キー |
|---|---|
| 段落を分割 | `Enter` |
| 段落内で改行 | `Shift + Enter` |
| 一段深くする | `Tab` |
| 一段浅くする | `Shift + Tab` |
| 上下へ移動 | `Alt + Shift + ↑ / ↓` |
| WRITE / SHAPE | `Ctrl / Cmd + Shift + O` |
| Margin | `Ctrl / Cmd + Shift + M` |
| 形式を選んでコピー | `Ctrl / Cmd + Alt + C` |
| 集中 / 一つ上へ戻る | `Ctrl / Cmd + . / ,` |
| Undo / Redo | `Ctrl / Cmd + Z / Shift + Z` |

## 保存について

原稿はブラウザのIndexedDBへ保存されます。myspinesが本文をサーバーやAIへ送信することはありません。

一方、ブラウザデータを削除すると原稿も失われる可能性があります。節目ごとに「完全JSONを退避する」を利用してください。

## 技術方針

現在の`0.1.x`は、プロダクトの操作感を実原稿で検証できる、依存パッケージなしの縦切りMVPです。

- 編集意図は`beforeinput`を中心に扱う
- IME変換中は構造操作を起こさない
- 構造操作は一回のUndoで戻す
- 原稿データを自動で正規化しない
- 成功通知は抑え、保存失敗だけを明確に伝える

専用編集エンジンへの移行は、IME・選択・Undo・モバイル入力の実機検証結果を基に判断します。詳しくは[`docs/architecture.md`](docs/architecture.md)を参照してください。

## 検査

```bash
npm run check
```

コードにはHow、テストにはWhat、コミットにはWhy、コメントにはWhy notを残す方針です。
