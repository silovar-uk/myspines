const APP_VERSION = "0.1.0";
const DB_NAME = "myspines-db";
const DB_VERSION = 1;
const BOOK_STORE = "books";
const LAST_BOOK_KEY = "myspines.lastBookId";
const HISTORY_LIMIT = 120;
const INPUT_GROUP_DELAY = 800;

const app = document.querySelector("#app");

const state = {
  books: [],
  book: null,
  history: [],
  redo: [],
  inputGroup: null,
  composing: false,
  compositionCaptured: false,
  saveTimer: null,
  saveError: null,
  toastTimer: null,
  modal: null,
  pendingPaste: null,
  copySelection: "",
};

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return typeof globalThis.structuredClone === "function" ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function createNode({ heading = "", body = "", children = [] } = {}) {
  return { id: createId(), heading, body, children };
}

function createBook(title = "まだ題のない本", nodes = [createNode()]) {
  const now = nowIso();
  return {
    id: createId(),
    schemaVersion: 1,
    title,
    authorName: "",
    targetCharacters: null,
    nextThread: "",
    manuscript: nodes,
    loose: [],
    notes: { global: "", byNode: {} },
    view: {
      mode: "write",
      lens: "explore",
      hoistedNodeId: null,
      selectedNodeId: nodes[0]?.id ?? null,
      collapsedIds: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNode(raw) {
  return {
    id: typeof raw?.id === "string" ? raw.id : createId(),
    heading: typeof raw?.heading === "string" ? raw.heading : "",
    body: typeof raw?.body === "string" ? raw.body : "",
    children: Array.isArray(raw?.children) ? raw.children.map(normalizeNode) : [],
  };
}

function normalizeBook(raw) {
  const fallback = createBook();
  const manuscript = Array.isArray(raw?.manuscript) && raw.manuscript.length
    ? raw.manuscript.map(normalizeNode)
    : fallback.manuscript;
  return {
    ...fallback,
    ...raw,
    id: typeof raw?.id === "string" ? raw.id : fallback.id,
    title: typeof raw?.title === "string" && raw.title.trim() ? raw.title : "まだ題のない本",
    nextThread: typeof raw?.nextThread === "string" ? raw.nextThread : "",
    manuscript,
    loose: Array.isArray(raw?.loose) ? raw.loose.map(normalizeNode) : [],
    notes: {
      global: typeof raw?.notes?.global === "string" ? raw.notes.global : "",
      byNode: raw?.notes?.byNode && typeof raw.notes.byNode === "object" ? raw.notes.byNode : {},
    },
    view: {
      ...fallback.view,
      ...(raw?.view ?? {}),
      selectedNodeId: raw?.view?.selectedNodeId ?? manuscript[0]?.id ?? null,
      collapsedIds: Array.isArray(raw?.view?.collapsedIds) ? raw.view.collapsedIds : [],
    },
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("保存領域を開けませんでした。"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const store = db.createObjectStore(BOOK_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, mode);
    const store = tx.objectStore(BOOK_STORE);
    let result;
    try {
      result = callback(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("保存できませんでした。"));
    };
    tx.onabort = tx.onerror;
  });
}

async function listBooks() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, "readonly");
    const request = tx.objectStore(BOOK_STORE).getAll();
    request.onsuccess = () => {
      const result = request.result.map(normalizeBook).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      db.close();
      resolve(result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("本の一覧を読めませんでした。"));
    };
  });
}

async function putBook(book) {
  const snapshot = deepClone(book);
  await withStore("readwrite", (store) => store.put(snapshot));
}

async function removeBook(bookId) {
  await withStore("readwrite", (store) => store.delete(bookId));
}

function scheduleSave({ immediate = false } = {}) {
  if (!state.book) return;
  state.book.updatedAt = nowIso();
  clearTimeout(state.saveTimer);

  // Why not read state.book inside the delayed callback: a user can switch books
  // before the debounce expires. Capture the intended manuscript now so one book
  // can never be silently written under another book's save cycle.
  const snapshot = deepClone(state.book);
  const save = async () => {
    try {
      await putBook(snapshot);
      state.saveError = null;
      const index = state.books.findIndex((book) => book.id === snapshot.id);
      if (index >= 0) state.books[index] = snapshot;
      else state.books.push(snapshot);
      state.books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : "保存できていません。";
      renderSaveError();
    }
  };
  if (immediate) void save();
  else state.saveTimer = setTimeout(save, 450);
}

function flushSave() {
  clearTimeout(state.saveTimer);
  if (state.book) scheduleSave({ immediate: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function countCharacters(text) {
  return Array.from(String(text).replace(/\s/gu, "")).length;
}

function ownNodeCharacters(node) {
  return countCharacters(node.body);
}

function subtreeCharacters(node) {
  return ownNodeCharacters(node) + node.children.reduce((sum, child) => sum + subtreeCharacters(child), 0);
}

function bookCharacters(book = state.book) {
  return book?.manuscript.reduce((sum, node) => sum + subtreeCharacters(node), 0) ?? 0;
}

function nodeLabel(node) {
  const heading = node.heading.trim();
  if (heading) return heading;
  const body = node.body.replace(/\s+/gu, " ").trim();
  if (!body) return "まだ書かれていない段落";
  const chars = Array.from(body);
  return chars.length > 40 ? `${chars.slice(0, 39).join("")}…` : body;
}

function walkNodes(nodes, callback, ancestors = [], container = "manuscript") {
  nodes.forEach((node, index) => {
    callback(node, { siblings: nodes, index, ancestors, container });
    walkNodes(node.children, callback, [...ancestors, node], container);
  });
}

function findNodeContext(nodeId, book = state.book) {
  if (!book || !nodeId) return null;
  let found = null;
  const search = (nodes, ancestors, container, parentContext) => {
    nodes.some((node, index) => {
      if (node.id === nodeId) {
        found = { node, siblings: nodes, index, ancestors, container, parentContext };
        return true;
      }
      const childParent = { node, siblings: nodes, index, ancestors, container, parentContext };
      return search(node.children, [...ancestors, node], container, childParent);
    });
    return Boolean(found);
  };
  search(book.manuscript, [], "manuscript", null);
  if (!found) search(book.loose, [], "loose", null);
  return found;
}

function findNode(nodeId) {
  return findNodeContext(nodeId)?.node ?? null;
}

function getPath(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context) return [];
  return [...context.ancestors, context.node];
}

function getCurrentNodeId() {
  const focused = document.activeElement?.closest?.("[data-node-id]")?.dataset.nodeId;
  return focused || state.book?.view.selectedNodeId || state.book?.view.hoistedNodeId || state.book?.manuscript[0]?.id || null;
}

function setSelectedNode(nodeId) {
  if (!state.book || !nodeId) return;
  state.book.view.selectedNodeId = nodeId;
  scheduleSave();
  updateQuietStatus();
}

function captureFocus() {
  const active = document.activeElement;
  if (!active) return null;
  const holder = active.closest?.("[data-node-id]");
  const nodeId = holder?.dataset.nodeId;
  if (!nodeId) return null;
  if (active.classList.contains("node-heading")) {
    return { nodeId, field: "heading", offset: active.selectionStart ?? 0 };
  }
  if (active.classList.contains("node-body")) {
    const selection = getSelectionOffsets(active);
    return { nodeId, field: "body", offset: selection?.start ?? 0 };
  }
  return { nodeId, field: "row", offset: 0 };
}

function restoreFocus(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    const selector = snapshot.field === "heading"
      ? `.node-heading[data-node-id="${CSS.escape(snapshot.nodeId)}"]`
      : snapshot.field === "body"
        ? `.node-body[data-node-id="${CSS.escape(snapshot.nodeId)}"]`
        : `.outline-label[data-node-id="${CSS.escape(snapshot.nodeId)}"]`;
    const element = document.querySelector(selector);
    if (!element) return;
    element.focus({ preventScroll: true });
    if (snapshot.field === "heading") {
      const position = Math.min(snapshot.offset, element.value.length);
      element.setSelectionRange(position, position);
    } else if (snapshot.field === "body") {
      setCaretOffset(element, snapshot.offset);
    }
    element.scrollIntoView({ block: "center", behavior: "auto" });
  });
}

function getSelectionOffsets(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return null;
  const preStart = range.cloneRange();
  preStart.selectNodeContents(element);
  preStart.setEnd(range.startContainer, range.startOffset);
  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(element);
  preEnd.setEnd(range.endContainer, range.endOffset);
  return { start: preStart.toString().length, end: preEnd.toString().length, collapsed: range.collapsed };
}

function setCaretOffset(element, offset) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let current;
  while ((current = walker.nextNode())) {
    const length = current.nodeValue?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(current, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function pushHistory(label, focus = captureFocus()) {
  if (!state.book) return;
  state.history.push({ label, book: deepClone(state.book), focus });
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  state.redo = [];
}

function resetInputGroup() {
  state.inputGroup = null;
  state.compositionCaptured = false;
}

function beginInputHistory(nodeId, field) {
  const now = Date.now();
  const current = state.inputGroup;
  if (!current || current.nodeId !== nodeId || current.field !== field || now - current.time > INPUT_GROUP_DELAY) {
    pushHistory("入力");
  }
  state.inputGroup = { nodeId, field, time: now };
}

function undo() {
  if (!state.book || !state.history.length) return;
  const previous = state.history.pop();
  state.redo.push({ label: previous.label, book: deepClone(state.book), focus: captureFocus() });
  state.book = normalizeBook(previous.book);
  resetInputGroup();
  render();
  restoreFocus(previous.focus);
  scheduleSave({ immediate: true });
}

function redo() {
  if (!state.book || !state.redo.length) return;
  const next = state.redo.pop();
  state.history.push({ label: next.label, book: deepClone(state.book), focus: captureFocus() });
  state.book = normalizeBook(next.book);
  resetInputGroup();
  render();
  restoreFocus(next.focus);
  scheduleSave({ immediate: true });
}

function mutateStructure(label, mutate, focus) {
  if (!state.book) return;
  pushHistory(label);
  mutate();
  resetInputGroup();
  state.book.updatedAt = nowIso();
  render();
  restoreFocus(typeof focus === "function" ? focus() : focus);
  scheduleSave();
}
