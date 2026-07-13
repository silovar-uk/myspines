// UI v4 defaults: numbered outlines, a collapsible memo pane, and a compact writing layout.
const LAYOUT_DENSITY_VERSION = 1;

function clampOutlineWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 248;
  return Math.min(340, Math.max(200, Math.round(number)));
}

function defaultMemoOpen() {
  return typeof window === "undefined" ? true : window.innerWidth >= 1440;
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
      outlineWidth: 248,
      memoOpen: defaultMemoOpen(),
      layoutDensityVersion: LAYOUT_DENSITY_VERSION,
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
  const usesCompactLayout =
    raw?.view?.layoutDensityVersion === LAYOUT_DENSITY_VERSION;
  const previousOutlineWidth = Number(raw?.view?.outlineWidth);
  const migratedOutlineWidth = Number.isFinite(previousOutlineWidth)
    ? Math.min(previousOutlineWidth, 260)
    : fallback.view.outlineWidth;

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
      outlineWidth: usesCompactLayout
        ? clampOutlineWidth(raw?.view?.outlineWidth)
        : clampOutlineWidth(migratedOutlineWidth),
      memoOpen:
        usesCompactLayout && typeof raw?.view?.memoOpen === "boolean"
          ? raw.view.memoOpen
          : defaultMemoOpen(),
      layoutDensityVersion: LAYOUT_DENSITY_VERSION,
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
