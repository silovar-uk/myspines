function totalNodeCount(nodes = state.book?.manuscript ?? []) {
  return nodes.reduce((sum, node) => sum + 1 + totalNodeCount(node.children), 0);
}

function updateQuietStatus() {
  const status = document.querySelector("#quiet-status");
  if (!status || !state.book) return;
  const node = findNode(getCurrentNodeId());
  const total = bookCharacters();
  const count = totalNodeCount();
  if (count === 1 && total < 80) {
    status.textContent = "Enter　次の段落 ｜ Shift + Enter　段落内で改行";
    return;
  }
  if (count <= 3 && total < 500 && !state.book.manuscript.some((item) => item.children.length)) {
    status.textContent = "Tab　一段深くする ｜ Ctrl / ⌘ + Shift + O　構造を見る";
    return;
  }
  const local = node ? subtreeCharacters(node) : 0;
  status.textContent = node
    ? `現在 ${local.toLocaleString("ja-JP")}字 ｜ 本全体 ${total.toLocaleString("ja-JP")}字`
    : `本全体 ${total.toLocaleString("ja-JP")}字`;
}

function renderSaveError() {
  const slot = document.querySelector("#save-error-slot");
  if (!slot) return;
  slot.innerHTML = state.saveError
    ? `<div class="save-error">保存できていません。このタブを閉じず、JSONへ退避してください。 <button class="secondary-button" style="min-height:30px;padding:3px 8px" data-action="more">退避する</button></div>`
    : "";
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

function handleGlobalKeydown(event) {
  if (state.modal && event.key === "Escape") return closeModal();
  if (event.key === "Escape" && state.book?.view.marginOpen) return closeMargin();
  if (!state.book || event.isComposing || state.composing) return;
  const command = event.metaKey || event.ctrlKey;
  if (command && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }
  if (command && event.shiftKey && event.key.toLowerCase() === "o") {
    event.preventDefault();
    toggleMode();
    return;
  }
  if (command && event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    state.book.view.marginOpen ? closeMargin() : openMargin();
    return;
  }
  if (command && event.altKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    openCopyDialog(getCurrentNodeId());
    return;
  }
  if (command && event.key === ".") {
    event.preventDefault();
    const nodeId = getCurrentNodeId();
    if (nodeId) hoistNode(nodeId);
    return;
  }
  if (command && event.key === ",") {
    event.preventDefault();
    const current = state.book.view.hoistedNodeId;
    const path = current ? getPath(current) : [];
    const parent = path.length > 1 ? path[path.length - 2].id : null;
    unhoist(parent);
    return;
  }
  if (command && (event.key === "?" || (event.shiftKey && event.key === "/"))) {
    event.preventDefault();
    openHelpDialog();
  }
}

async function init() {
  try {
    state.books = await listBooks();
  } catch (error) {
    state.saveError = error instanceof Error ? error.message : "保存領域を開けませんでした。";
  }
  const lastBookId = localStorage.getItem(LAST_BOOK_KEY);
  const lastBook = state.books.find((book) => book.id === lastBookId);
  if (lastBook) state.book = normalizeBook(deepClone(lastBook));
  render();
  document.addEventListener("keydown", handleGlobalKeydown, true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
  window.addEventListener("pagehide", flushSave);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

void init();
