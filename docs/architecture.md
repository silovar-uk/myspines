# Architecture

## 現在の位置づけ

`0.1.x`は、思想と操作を実原稿で検証するための、静的・依存パッケージなしの縦切りMVP。

GitHub Pagesへそのまま配置でき、ビルドサービスや外部CDNを必要としない。原稿はIndexedDBへ保存する。

## データモデル

一冊の本は次の要素を持つ。

```text
Book
├─ manuscript: OutlineNode[]
├─ loose: OutlineNode[]
├─ notes
│  ├─ global
│  └─ byNode
└─ view
   ├─ mode
   ├─ lens
   ├─ hoistedNodeId
   └─ collapsedIds
```

各`OutlineNode`は、任意の見出し、本文、子ノードを持つ。

```text
OutlineNode
├─ id
├─ heading
├─ body
└─ children[]
```

深さ、アウトライン番号、文字数、パンくずは保存せず、ツリーから導出する。

## 編集イベント

- `beforeinput: insertParagraph`で段落を分割
- `beforeinput: deleteContentBackward`で境界結合
- `compositionstart / compositionend`でIME変換を一つの編集意図として扱う
- 通常入力は800ms単位でUndoグループ化
- 構造操作は操作前スナップショットを一件積む

## 保存

- 入力後450msでIndexedDBへ保存
- `visibilitychange`と`pagehide`で即時flush
- 完全JSONのみがmyspinesへ完全復元できる正本

## 次のアーキテクチャ判断

実機検証後、次のどちらかを選ぶ。

1. 現在の軽量モデルを、選択範囲・履歴・複数段落編集に耐える形へ強化
2. ProseMirrorを直接導入し、文書ツリーとトランザクションを正本に移行

ProseMirror移行の条件：

- 日本語IMEのイベント順を実機で安定して扱える
- 一変換一Undoを保証できる
- 分割・結合後に選択位置を復元できる
- スマホSafariで入力が崩れない
- 現行JSONから移行できる

## 守る境界

UIから直接ツリーを変更せず、構造操作関数を通す。

- `splitNode`
- `joinBackward / joinForward`
- `indentNode / outdentNode`
- `moveNode`
- `moveToLoose / returnToManuscript`
- `duplicateNode / deleteNode`

今後のReact化・編集エンジン変更でも、この操作語彙を維持する。
