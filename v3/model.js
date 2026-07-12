// UI v3 defaults: the outline supports a resizable desktop split and a tablet overlay.
function clampOutlineWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 288;
  return Math.min(400, Math.max(220, Math.round(number)));
}

function createBook(title = "無題の原稿", nodes = [createNode()]) {
  const now = nowIso();
  return {
    id: createId(), schemaVersion: 1, title, authorName: "", targetCharacters: null, nextThread: "",
    manuscript: nodes, loose: [], notes: { global: "", byNode: {} },
    view: {
      mode: "write",
      lens: "explore",
      hoistedNodeId: null,
      selectedNodeId: nodes[0]?.id ?? null,
      collapsedIds: [],
      outlineOpen: true,
      outlineWidth: 288,
      outlineMetrics: false,
    },
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
      outlineWidth: clampOutlineWidth(raw?.view?.outlineWidth),
      outlineMetrics: raw?.view?.outlineMetrics === true,
    },
  };
}

// Why not keep the v1 row selector: UI v3 separates navigation and manipulation,
// so structural focus can land on either the table row or the sidebar map.
function restoreFocus(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    const escapedId = CSS.escape(snapshot.nodeId);
    const selector = snapshot.field === "heading"
      ? `.node-heading[data-node-id="${escapedId}"]`
      : snapshot.field === "body"
        ? `.node-body[data-node-id="${escapedId}"]`
        : `:where(.structure-title-cell, .outline-label, .sidebar-label)[data-node-id="${escapedId}"]`;
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

state.paragraphMenuNodeId ??= null;
