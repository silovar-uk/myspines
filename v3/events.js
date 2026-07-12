function handleClick(event) {
  const target = event.target.closest?.("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const nodeId = target.dataset.nodeId;
  if (action === "new-book") return createAndOpenBook();
  if (action === "import") return openImportDialog();
  if (action === "open-book") return openBook(target.dataset.bookId);
  if (action === "delete-book") return deleteBookFromLibrary(target.dataset.bookId);
  if (action === "library") return openLibraryDialog();
  if (action === "mode-write") return setMode("write");
  if (action === "mode-shape") return setMode("shape");
  if (action === "toggle-outline") return toggleOutlineSidebar();
  if (action === "close-outline") return setOutlineOpen(false);
  if (action === "toggle-outline-metrics") return toggleOutlineMetrics();
  if (action === "jump-node") return jumpToNode(nodeId);
  if (action === "toggle-collapse") return closeParagraphMenuThen(() => toggleCollapsed(nodeId));
  if (action === "add-heading") return closeParagraphMenuThen(() => revealHeadingAfterRender(nodeId));
  if (action === "paragraph-menu") return openParagraphMenu(nodeId);
  if (action === "close-paragraph-menu") return closeParagraphMenu();
  if (action === "select-node") {
    setSelectedNode(nodeId);
    render();
    restoreFocus({ nodeId, field: "row", offset: 0 });
    return;
  }
  if (action === "focus-node") return hoistNode(nodeId);
  if (action === "unhoist") return unhoist(target.dataset.nodeId || null);
  if (action === "move-up") return closeParagraphMenuThen(() => moveNode(nodeId, -1));
  if (action === "move-down") return closeParagraphMenuThen(() => moveNode(nodeId, 1));
  if (action === "indent") return closeParagraphMenuThen(() => indentNode(nodeId));
  if (action === "outdent") return closeParagraphMenuThen(() => outdentNode(nodeId));
  if (action === "duplicate") return closeParagraphMenuThen(() => duplicateNode(nodeId));
  if (action === "delete-node") return closeParagraphMenuThen(() => deleteNode(nodeId));
  if (action === "move-loose") return closeParagraphMenuThen(() => moveToLoose(nodeId));
  if (action === "return-manuscript") return closeParagraphMenuThen(() => returnToManuscript(nodeId));
  if (action === "new-root") return addRootNode();
  if (action === "copy-node") return closeParagraphMenuThen(() => quickCopyNode(nodeId));
  if (action === "copy") return openCopyDialog(nodeId || getCurrentNodeId());
  if (action === "collapse-all") return setAllCollapsed(true);
  if (action === "expand-all") return setAllCollapsed(false);
  if (action === "margin") return openMargin();
  if (action === "close-margin") return closeMargin();
  if (action === "more") return openMoreDialog();
  if (action === "help") return openHelpDialog();
}

function setMode(mode) {
  state.paragraphMenuNodeId = null;
  return toggleMode(mode);
}

function revealHeading(nodeId) {
  const input = document.querySelector(`.node-heading[data-node-id="${CSS.escape(nodeId)}"]`);
  if (!input) return;
  input.classList.add("is-revealed");
  input.focus();
}

function revealHeadingAfterRender(nodeId) {
  state.paragraphMenuNodeId = null;
  render();
  requestAnimationFrame(() => revealHeading(nodeId));
}

function setOutlineOpen(open) {
  if (!state.book) return;
  state.book.view.outlineOpen = open;
  render();
  scheduleSave();
}

function toggleOutlineSidebar() {
  if (!state.book) return;
  setOutlineOpen(state.book.view.outlineOpen === false);
}

function toggleOutlineMetrics() {
  if (!state.book) return;
  state.book.view.outlineMetrics = state.book.view.outlineMetrics !== true;
  render();
  scheduleSave();
}

function openParagraphMenu(nodeId) {
  if (!state.book || !findNode(nodeId)) return;
  state.book.view.selectedNodeId = nodeId;
  state.paragraphMenuNodeId = nodeId;
  render();
}

function closeParagraphMenu() {
  if (!state.paragraphMenuNodeId) return;
  state.paragraphMenuNodeId = null;
  render();
}

function closeParagraphMenuThen(callback) {
  state.paragraphMenuNodeId = null;
  return callback();
}

function jumpToNode(nodeId) {
  if (!state.book || !findNode(nodeId)) return;
  const pathIds = getPath(nodeId).map((node) => node.id);
  state.book.view.collapsedIds = state.book.view.collapsedIds.filter((id) => !pathIds.includes(id));
  state.book.view.selectedNodeId = nodeId;
  state.paragraphMenuNodeId = null;
  if (state.book.view.mode !== "write") state.book.view.mode = "write";
  if (window.innerWidth < 1040) state.book.view.outlineOpen = false;
  render();
  restoreFocus({ nodeId, field: "body", offset: 0 });
  scheduleSave();
}

function collectCollapsibleIds(nodes, output = []) {
  nodes.forEach((node) => {
    if (node.children.length) output.push(node.id);
    collectCollapsibleIds(node.children, output);
  });
  return output;
}

function setAllCollapsed(collapsed) {
  if (!state.book) return;
  state.book.view.collapsedIds = collapsed
    ? [...collectCollapsibleIds(state.book.manuscript), ...collectCollapsibleIds(state.book.loose)]
    : [];
  render();
  scheduleSave();
}

function addRootNode() {
  const node = createNode();
  mutateStructure("項目を追加", () => {
    state.book.manuscript.push(node);
    state.book.view.selectedNodeId = node.id;
  }, { nodeId: node.id, field: "row", offset: 0 });
}

function deleteNode(nodeId) {
  const context = findNodeContext(nodeId);
  if (!context) return;
  const count = 1 + countDescendants(context.node);
  const confirmed = window.confirm(count > 1
    ? `この項目と配下${count - 1}件を削除しますか？\nUndoで戻せます。`
    : "この項目を削除しますか？\nUndoで戻せます。");
  if (!confirmed) return;
  mutateStructure("部分木を削除", () => {
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
