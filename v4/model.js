// UI v4 defaults: numbered outlines and a collapsible right-side memo pane.
function clampOutlineWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 280;
  return Math.min(380, Math.max(220, Math.round(number)));
}

function defaultMemoOpen() {
  return typeof window === "undefined" ? true : window.innerWidth >= 1280;
}

function createBook(title = "無題の原稿", nodes = [createNode()]) {
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
      outlineOpen: true,
      outlineWidth: 280,
      memoOpen: defaultMemoOpen(),
    },
    createdAt: now,
    updatedAt: now,
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
    title:
      typeof raw?.title === "string" && raw.title.trim()
        ? raw.title === "まだ題のない本"
          ? "無題の原稿"
          : raw.title
        : "無題の原稿",
    nextThread: typeof raw?.nextThread === "string" ? raw.nextThread : "",
    manuscript,
    loose: Array.isArray(raw?.loose) ? raw.loose.map(normalizeNode) : [],
    notes: {
      global: typeof raw?.notes?.global === "string" ? raw.notes.global : "",
      byNode:
        raw?.notes?.byNode && typeof raw.notes.byNode === "object"
          ? raw.notes.byNode
          : {},
    },
    view: {
      ...fallback.view,
      ...(raw?.view ?? {}),
      selectedNodeId: raw?.view?.selectedNodeId ?? manuscript[0]?.id ?? null,
      collapsedIds: Array.isArray(raw?.view?.collapsedIds)
        ? raw.view.collapsedIds
        : [],
      outlineOpen: raw?.view?.outlineOpen !== false,
      outlineWidth: clampOutlineWidth(raw?.view?.outlineWidth),
      memoOpen:
        typeof raw?.view?.memoOpen === "boolean"
          ? raw.view.memoOpen
          : defaultMemoOpen(),
    },
  };
}

function formatOutlineNumber(path) {
  return path.length ? path.join(".") : "";
}

function findOutlinePath(nodeId, nodes = state.book?.manuscript ?? [], prefix = []) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const path = [...prefix, index + 1];
    if (node.id === nodeId) return path;
    const childPath = findOutlinePath(nodeId, node.children, path);
    if (childPath) return childPath;
  }
  return null;
}

function outlineNumberForNode(nodeId) {
  const path = findOutlinePath(nodeId);
  return path ? formatOutlineNumber(path) : "";
}

state.paragraphMenuNodeId ??= null;
