function splitNode(nodeId, offset) {
  const context = findNodeContext(nodeId);
  if (!context) return;
  const body = context.node.body;
  const safeOffset = Math.max(0, Math.min(offset, body.length));
  const newNode = createNode({ body: body.slice(safeOffset) });
  mutateStructure("段落を分割", () => {
    context.node.body = body.slice(0, safeOffset);
    context.siblings.splice(context.index + 1, 0, newNode);
    state.book.view.selectedNodeId = newNode.id;
  }, { nodeId: newNode.id, field: "body", offset: 0 });
}

function joinBackward(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context || context.index === 0) return false;
  const node = context.node;
  const previous = context.siblings[context.index - 1];
  if (node.heading.trim()) {
    showToast("見出しのある段落は、構造画面から移動・削除できます。");
    return false;
  }
  const boundary = previous.body.length;
  mutateStructure("段落を結合", () => {
    previous.body += node.body;
    previous.children.push(...node.children);
    context.siblings.splice(context.index, 1);
    state.book.view.selectedNodeId = previous.id;
  }, { nodeId: previous.id, field: "body", offset: boundary });
  return true;
}

function joinForward(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context || context.index >= context.siblings.length - 1) return false;
  const next = context.siblings[context.index + 1];
  if (next.heading.trim()) {
    showToast("次の段落には見出しがあります。構造画面から操作してください。");
    return false;
  }
  const boundary = context.node.body.length;
  mutateStructure("段落を結合", () => {
    context.node.body += next.body;
    context.node.children.push(...next.children);
    context.siblings.splice(context.index + 1, 1);
    state.book.view.selectedNodeId = context.node.id;
  }, { nodeId: context.node.id, field: "body", offset: boundary });
  return true;
}

function indentNode(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context || context.index === 0) return;
  const previous = context.siblings[context.index - 1];
  mutateStructure("一段深くする", () => {
    context.siblings.splice(context.index, 1);
    previous.children.push(context.node);
    state.book.view.selectedNodeId = context.node.id;
  }, { nodeId, field: state.book.view.mode === "write" ? "body" : "row", offset: 0 });
}

function outdentNode(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context?.parentContext) return;
  const parent = context.parentContext;
  mutateStructure("一段浅くする", () => {
    context.siblings.splice(context.index, 1);
    parent.siblings.splice(parent.index + 1, 0, context.node);
    state.book.view.selectedNodeId = context.node.id;
  }, { nodeId, field: state.book.view.mode === "write" ? "body" : "row", offset: 0 });
}

function moveNode(nodeId, direction) {
  const context = findNodeContext(nodeId);
  if (!context) return;
  const nextIndex = context.index + direction;
  if (nextIndex < 0 || nextIndex >= context.siblings.length) return;
  mutateStructure(direction < 0 ? "上へ移動" : "下へ移動", () => {
    const [node] = context.siblings.splice(context.index, 1);
    context.siblings.splice(nextIndex, 0, node);
    state.book.view.selectedNodeId = nodeId;
  }, { nodeId, field: state.book.view.mode === "write" ? "body" : "row", offset: captureFocus()?.offset ?? 0 });
}

function cloneNodeWithNewIds(node) {
  return {
    id: createId(),
    heading: node.heading,
    body: node.body,
    children: node.children.map(cloneNodeWithNewIds),
  };
}

function duplicateNode(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context) return;
  const copy = cloneNodeWithNewIds(context.node);
  mutateStructure("部分木を複製", () => {
    context.siblings.splice(context.index + 1, 0, copy);
    state.book.view.selectedNodeId = copy.id;
  }, { nodeId: copy.id, field: state.book.view.mode === "write" ? "body" : "row", offset: 0 });
}

function deleteNode(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context) return;
  const count = 1 + countDescendants(context.node);
  const confirmed = window.confirm(count > 1
    ? `この項目と配下${count - 1}件を外しますか？\nUndoで戻せます。`
    : "この項目を外しますか？\nUndoで戻せます。");
  if (!confirmed) return;
  mutateStructure("部分木を外す", () => {
    context.siblings.splice(context.index, 1);
    if (context.container === "manuscript" && state.book.manuscript.length === 0) {
      state.book.manuscript.push(createNode());
    }
    state.book.view.selectedNodeId = context.siblings[Math.min(context.index, context.siblings.length - 1)]?.id
      ?? state.book.manuscript[0]?.id
      ?? null;
    if (state.book.view.hoistedNodeId === nodeId) state.book.view.hoistedNodeId = null;
    state.book.view.collapsedIds = state.book.view.collapsedIds.filter((id) => id !== nodeId);
  }, { nodeId: state.book.view.selectedNodeId, field: state.book.view.mode === "write" ? "body" : "row", offset: 0 });
}

function countDescendants(node) {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function moveToLoose(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context || context.container === "loose") return;
  mutateStructure("未配置へ移動", () => {
    const [node] = context.siblings.splice(context.index, 1);
    state.book.loose.push(node);
    if (!state.book.manuscript.length) state.book.manuscript.push(createNode());
    state.book.view.selectedNodeId = node.id;
  }, { nodeId, field: "row", offset: 0 });
}

function returnToManuscript(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context || context.container !== "loose") return;
  mutateStructure("本文へ戻す", () => {
    const [node] = context.siblings.splice(context.index, 1);
    state.book.manuscript.push(node);
    state.book.view.selectedNodeId = node.id;
  }, { nodeId, field: "row", offset: 0 });
}

function toggleCollapsed(nodeId) {
  if (!state.book) return;
  const set = new Set(state.book.view.collapsedIds);
  if (set.has(nodeId)) set.delete(nodeId);
  else set.add(nodeId);
  state.book.view.collapsedIds = [...set];
  render();
  scheduleSave();
}

function toggleMode(mode = state.book?.view.mode === "write" ? "shape" : "write") {
  if (!state.book) return;
  state.book.view.mode = mode;
  render();
  scheduleSave();
  const selected = state.book.view.selectedNodeId;
  restoreFocus(selected ? { nodeId: selected, field: mode === "write" ? "body" : "row", offset: 0 } : null);
}

function setLens(lens) {
  if (!state.book) return;
  state.book.view.lens = lens;
  render();
  scheduleSave();
  showToast(lens === "explore" ? "ひろげる｜判断を後回しにします" : "ととのえる｜構造を見渡します");
}

function hoistNode(nodeId) {
  if (!state.book || !findNode(nodeId)) return;
  state.book.view.hoistedNodeId = nodeId;
  state.book.view.selectedNodeId = nodeId;
  state.book.view.mode = "write";
  render();
  restoreFocus({ nodeId, field: "body", offset: 0 });
  scheduleSave();
}

function unhoist(levelNodeId = null) {
  if (!state.book) return;
  state.book.view.hoistedNodeId = levelNodeId;
  render();
  scheduleSave();
}
