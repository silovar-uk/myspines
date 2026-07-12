function getEditorSelectionText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return "";
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!container?.closest?.(".manuscript")) return "";
  return selection.toString();
}

async function quickCopyNode(nodeId) {
  const node = findNode(nodeId);
  if (!node) return;
  const text = node.body || node.heading;
  await copyText(text);
  showToast("この段落をコピーしました");
}

function openCopyDialog(nodeId) {
  if (!state.book) return;
  const node = findNode(nodeId);
  state.copySelection = getEditorSelectionText();
  const defaultScope = state.copySelection ? "selection" : node ? "subtree" : "book";
  const initial = serializeCopy(defaultScope, state.copySelection ? "plain" : "markdown", nodeId);
  openModal(`
    <div class="modal-header"><div><h2>コピー</h2><div class="modal-subtitle">コピーする範囲と形式を選びます。</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <div class="option-grid">
      ${state.copySelection ? `<label class="option-card"><input type="radio" name="copy-scope" value="selection" checked><span><strong>選択した文字</strong><br><small>${countCharacters(state.copySelection)}文字</small></span></label>` : ""}
      ${node ? `<label class="option-card"><input type="radio" name="copy-scope" value="node"><span><strong>この段落</strong><br><small>本文ひとつ</small></span></label>
      <label class="option-card"><input type="radio" name="copy-scope" value="subtree" ${state.copySelection ? "" : "checked"}><span><strong>この項目と配下</strong><br><small>階層をまとめてコピー</small></span></label>` : ""}
      <label class="option-card"><input type="radio" name="copy-scope" value="focus"><span><strong>現在の表示範囲</strong><br><small>集中している章・節</small></span></label>
      <label class="option-card"><input type="radio" name="copy-scope" value="book" ${node ? "" : "checked"}><span><strong>本全体</strong><br><small>原稿のすべて</small></span></label>
    </div>
    <div class="option-grid">
      <label class="option-card"><input type="radio" name="copy-format" value="plain" ${state.copySelection ? "checked" : ""}><span><strong>本文のみ</strong><br><small>見出し記号なし</small></span></label>
      <label class="option-card"><input type="radio" name="copy-format" value="headed"><span><strong>見出し付き</strong><br><small>プレーンテキスト</small></span></label>
      <label class="option-card"><input type="radio" name="copy-format" value="markdown" ${state.copySelection ? "" : "checked"}><span><strong>Markdown</strong><br><small>構造を保つ</small></span></label>
      <label class="option-card"><input type="radio" name="copy-format" value="ai"><span><strong>AIに渡す</strong><br><small>対象と前後を区別</small></span></label>
    </div>
    <div class="preview-box" id="copy-preview">${escapeHtml(initial)}</div>
    <div class="modal-actions"><button class="primary-button" data-modal-action="confirm-copy" data-node-id="${nodeId ?? ""}">コピー</button></div>
  `, (modal) => {
    modal.addEventListener("change", () => updateCopyPreview(modal, nodeId));
  });
}

function updateCopyPreview(modal, nodeId) {
  const scope = modal.querySelector('input[name="copy-scope"]:checked')?.value ?? "book";
  const format = modal.querySelector('input[name="copy-format"]:checked')?.value ?? "markdown";
  modal.querySelector("#copy-preview").textContent = serializeCopy(scope, format, nodeId);
}

function serializeCopy(scope, format, nodeId) {
  if (scope === "selection" && state.copySelection) {
    if (format === "ai") {
      const node = nodeId ? findNode(nodeId) : null;
      const path = node ? getPath(node.id).map(nodeLabel).join(" ＞ ") : state.book.title;
      return ["## 原稿上の位置", path, "## 編集対象", state.copySelection].join("\n\n");
    }
    return state.copySelection;
  }
  let nodes;
  let targetNode = nodeId ? findNode(nodeId) : null;
  if (scope === "node" && targetNode) nodes = [targetNode];
  else if (scope === "subtree" && targetNode) nodes = [targetNode];
  else if (scope === "focus" && state.book.view.hoistedNodeId) {
    const focused = findNode(state.book.view.hoistedNodeId);
    nodes = focused ? [focused] : state.book.manuscript;
    targetNode = focused;
  } else nodes = state.book.manuscript;

  if (format === "plain") return serializePlain(nodes, { includeHeadings: false, includeChildren: scope !== "node" });
  if (format === "headed") return serializePlain(nodes, { includeHeadings: true, includeChildren: scope !== "node" });
  if (format === "ai") return serializeAI(targetNode ?? nodes[0]);
  return serializeMarkdown(nodes, { includeChildren: scope !== "node" });
}

function serializePlain(nodes, { includeHeadings, includeChildren }, output = []) {
  nodes.forEach((node) => {
    if (includeHeadings && node.heading.trim()) output.push(node.heading.trim());
    if (node.body.trim()) output.push(node.body.trim());
    if (includeChildren) serializePlain(node.children, { includeHeadings, includeChildren }, output);
  });
  return output.join("\n\n");
}

function serializeMarkdown(nodes, { includeChildren = true } = {}) {
  const output = [];
  const visit = (node, depth) => {
    if (node.heading.trim()) output.push(`${"#".repeat(Math.min(depth + 1, 6))} ${node.heading.trim()}`);
    if (node.body.trim()) output.push(node.body.trim());
    if (includeChildren) node.children.forEach((child) => visit(child, node.heading.trim() ? depth + 1 : depth));
  };
  nodes.forEach((node) => visit(node, 0));
  return output.join("\n\n");
}

function serializeAI(node) {
  if (!node) return serializeMarkdown(state.book.manuscript);
  const context = findNodeContext(node.id);
  const path = getPath(node.id).map(nodeLabel).join(" ＞ ");
  const previous = context?.siblings[context.index - 1];
  const next = context?.siblings[context.index + 1];
  const parts = ["## 原稿上の位置", path || state.book.title, "## 編集対象", node.body || node.heading];
  if (previous) parts.push("## 前の段落", previous.body || previous.heading);
  if (next) parts.push("## 次の段落", next.body || next.heading);
  return parts.join("\n\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(title) {
  return (title || "myspines").replace(/[\\/:*?"<>|]/g, "_");
}

function exportMarkdown() {
  downloadText(`${safeFilename(state.book.title)}.md`, serializeMarkdown(state.book.manuscript), "text/markdown;charset=utf-8");
  showToast("Markdownを書き出しました");
}

function exportText() {
  downloadText(`${safeFilename(state.book.title)}.txt`, serializePlain(state.book.manuscript, { includeHeadings: true, includeChildren: true }));
  showToast("本文テキストを書き出しました");
}

function exportJson() {
  const backup = { app: "myspines", version: APP_VERSION, exportedAt: nowIso(), book: state.book };
  downloadText(`${safeFilename(state.book.title)}.myspines.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
  showToast("完全JSONを退避しました");
}

function openModal(content, onReady) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true">${content}</section>`;
  document.body.append(backdrop);
  state.modal = backdrop;
  backdrop.addEventListener("click", handleModalClick);
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) closeModal();
  });
  onReady?.(backdrop.querySelector(".modal"));
  requestAnimationFrame(() => backdrop.querySelector("input, textarea, button")?.focus());
}

function closeModal() {
  state.modal?.remove();
  state.modal = null;
}

async function handleModalClick(event) {
  const target = event.target.closest("[data-modal-action]");
  if (!target) return;
  const action = target.dataset.modalAction;
  if (action === "close") return closeModal();
  if (action === "new") { closeModal(); return createAndOpenBook(); }
  if (action === "import") { closeModal(); return openImportDialog(); }
  if (action === "help") { closeModal(); return openHelpDialog(); }
  if (action === "undo") { closeModal(); return undo(); }
  if (action === "export-md") { closeModal(); return exportMarkdown(); }
  if (action === "export-txt") { closeModal(); return exportText(); }
  if (action === "export-json") { closeModal(); return exportJson(); }
  if (action === "confirm-import") {
    const modal = target.closest(".modal");
    const text = modal.querySelector("#import-text").value;
    const title = modal.querySelector("#import-title").value.trim() || "無題の原稿";
    const mode = modal.querySelector('input[name="import-mode"]:checked')?.value ?? "paragraphs";
    try {
      const parsed = parseImport(text, mode);
      closeModal();
      if (mode === "json") {
        state.book = parsed;
        state.book.id = createId();
        state.book.title = `${state.book.title}（復元）`;
        await putBook(state.book);
        state.books.unshift(deepClone(state.book));
        localStorage.setItem(LAST_BOOK_KEY, state.book.id);
        render();
      } else {
        await createAndOpenBook(title, parsed);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "原稿を読み取れませんでした。", 5000);
    }
    return;
  }
  if (action === "confirm-copy") {
    const modal = target.closest(".modal");
    const scope = modal.querySelector('input[name="copy-scope"]:checked')?.value ?? "book";
    const format = modal.querySelector('input[name="copy-format"]:checked')?.value ?? "markdown";
    const text = serializeCopy(scope, format, target.dataset.nodeId || null);
    await copyText(text);
    closeModal();
    showToast(`${countCharacters(text).toLocaleString("ja-JP")}文字をコピーしました`);
  }
}

function showToast(message, duration = 2600) {
  clearTimeout(state.toastTimer);
  document.querySelector(".toast:not(.paste-suggestion)")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  state.toastTimer = setTimeout(() => element.remove(), duration);
}
