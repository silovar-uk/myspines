async function createAndOpenBook(title = "無題の原稿", nodes = [createNode()]) {
  const book = createBook(title, nodes);
  state.book = book;
  state.history = [];
  state.redo = [];
  localStorage.setItem(LAST_BOOK_KEY, book.id);
  await putBook(book);
  state.books.unshift(deepClone(book));
  render();
  restoreFocus({ nodeId: book.manuscript[0].id, field: "body", offset: 0 });
}

async function openBook(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;
  state.book = normalizeBook(deepClone(book));
  state.history = [];
  state.redo = [];
  localStorage.setItem(LAST_BOOK_KEY, book.id);
  closeModal();
  render();
}

async function deleteBookFromLibrary(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;
  if (!window.confirm(`「${book.title}」をこの端末から削除しますか？\nJSONバックアップがない場合は戻せません。`)) return;
  await removeBook(bookId);
  state.books = state.books.filter((item) => item.id !== bookId);
  if (state.book?.id === bookId) state.book = null;
  if (localStorage.getItem(LAST_BOOK_KEY) === bookId) localStorage.removeItem(LAST_BOOK_KEY);
  closeModal();
  render();
}

function openMargin() {
  if (!state.book) return;
  state.book.view.marginOpen = true;
  render();
  requestAnimationFrame(() => document.querySelector("#node-note, #global-note")?.focus());
}

function closeMargin() {
  if (!state.book) return;
  state.book.view.marginOpen = false;
  render();
  restoreFocus({ nodeId: state.book.view.selectedNodeId, field: state.book.view.mode === "write" ? "body" : "row", offset: 0 });
  scheduleSave();
}

function openLibraryDialog() {
  openModal(`
    <div class="modal-header"><div><h2>原稿一覧</h2><div class="modal-subtitle">この端末に保存されている原稿</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <div class="library-list">${state.books.map(renderLibraryItem).join("")}</div>
    <div class="modal-actions"><button class="secondary-button" data-modal-action="import">原稿を持ち込む</button><button class="primary-button" data-modal-action="new">新しい原稿</button></div>
  `, (modal) => {
    modal.addEventListener("click", (event) => {
      const actionTarget = event.target.closest("[data-action]");
      if (actionTarget?.dataset.action === "open-book") openBook(actionTarget.dataset.bookId);
      if (actionTarget?.dataset.action === "delete-book") deleteBookFromLibrary(actionTarget.dataset.bookId);
    });
  });
}

function openMoreDialog() {
  openModal(`
    <div class="modal-header"><div><h2>書き出しと設定</h2><div class="modal-subtitle">形式を選んで原稿を保存・共有します。</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <div class="option-grid">
      <button class="option-card" data-modal-action="export-md">Markdownを書き出す</button>
      <button class="option-card" data-modal-action="export-txt">本文テキストを書き出す</button>
      <button class="option-card" data-modal-action="export-json">完全JSONを退避する</button>
      <button class="option-card" data-modal-action="import">別の原稿を持ち込む</button>
      <button class="option-card" data-modal-action="help">ショートカットを見る</button>
      <button class="option-card" data-modal-action="undo">元に戻す</button>
    </div>
    <p class="privacy-note">myspines ${APP_VERSION} ・ 原稿は外部へ送信されません。</p>
  `);
}

function openHelpDialog() {
  openModal(`
    <div class="modal-header"><div><h2>ショートカット</h2><div class="modal-subtitle">本文と構成をキーボードで操作できます。</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <dl class="help-list">
      <dt>次の段落へ分ける</dt><dd><kbd>Enter</kbd></dd>
      <dt>段落内で改行</dt><dd><kbd>Shift</kbd> + <kbd>Enter</kbd></dd>
      <dt>一段深くする</dt><dd><kbd>Tab</kbd></dd>
      <dt>一段浅くする</dt><dd><kbd>Shift</kbd> + <kbd>Tab</kbd></dd>
      <dt>段落を上下へ動かす</dt><dd><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>↑ / ↓</kbd></dd>
      <dt>本文 / 構成</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd></dd>
      <dt>メモ</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd></dd>
      <dt>形式を選んでコピー</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd></dd>
      <dt>元に戻す / やり直す</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Z</kbd> / <kbd>Shift</kbd> + <kbd>Z</kbd></dd>
      <dt>集中 / 全体へ戻る</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>.</kbd> / <kbd>,</kbd></dd>
    </dl>
  `);
}

function openImportDialog() {
  openModal(`
    <div class="modal-header"><div><h2>原稿を読み込む</h2><div class="modal-subtitle">テキスト、Markdown、バックアップJSONに対応しています。</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <label class="field-label" for="import-title">原稿のタイトル</label>
    <input class="text-input" id="import-title" value="無題の原稿" />
    <label class="field-label" for="import-text">原稿</label>
    <textarea class="textarea" id="import-text" style="min-height:280px" placeholder="ここへ貼り付ける。Markdownの見出しも読み取れます。"></textarea>
    <div class="option-grid">
      <label class="option-card"><input type="radio" name="import-mode" value="paragraphs" checked><span><strong>空行ごと</strong><br><small>段落として分ける</small></span></label>
      <label class="option-card"><input type="radio" name="import-mode" value="markdown"><span><strong>Markdown</strong><br><small>見出しを構造として読む</small></span></label>
      <label class="option-card"><input type="radio" name="import-mode" value="single"><span><strong>一つの段落</strong><br><small>原文をそのまま置く</small></span></label>
      <label class="option-card"><input type="radio" name="import-mode" value="json"><span><strong>myspines JSON</strong><br><small>完全バックアップを戻す</small></span></label>
    </div>
    <div class="modal-actions"><button class="primary-button" data-modal-action="confirm-import">取り込む</button></div>
  `);
}
