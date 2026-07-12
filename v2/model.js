// UI v2 defaults and backwards-compatible view normalization.
function createBook(title = "無題の原稿", nodes = [createNode()]) {
  const now = nowIso();
  return {
    id: createId(), schemaVersion: 1, title, authorName: "", targetCharacters: null, nextThread: "",
    manuscript: nodes, loose: [], notes: { global: "", byNode: {} },
    view: { mode: "write", lens: "explore", hoistedNodeId: null, selectedNodeId: nodes[0]?.id ?? null, collapsedIds: [], outlineOpen: true },
    createdAt: now, updatedAt: now,
  };
}

function normalizeBook(raw) {
  const fallback = createBook();
  const manuscript = Array.isArray(raw?.manuscript) && raw.manuscript.length ? raw.manuscript.map(normalizeNode) : fallback.manuscript;
  return {
    ...fallback, ...raw,
    id: typeof raw?.id === "string" ? raw.id : fallback.id,
    title: typeof raw?.title === "string" && raw.title.trim() ? (raw.title === "まだ題のない本" ? "無題の原稿" : raw.title) : "無題の原稿",
    nextThread: typeof raw?.nextThread === "string" ? raw.nextThread : "",
    manuscript,
    loose: Array.isArray(raw?.loose) ? raw.loose.map(normalizeNode) : [],
    notes: {
      global: typeof raw?.notes?.global === "string" ? raw.notes.global : "",
      byNode: raw?.notes?.byNode && typeof raw.notes.byNode === "object" ? raw.notes.byNode : {},
    },
    view: {
      ...fallback.view, ...(raw?.view ?? {}),
      selectedNodeId: raw?.view?.selectedNodeId ?? manuscript[0]?.id ?? null,
      collapsedIds: Array.isArray(raw?.view?.collapsedIds) ? raw.view.collapsedIds : [],
      outlineOpen: raw?.view?.outlineOpen !== false,
    },
  };
}
