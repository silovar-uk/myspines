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
  if (action === "mode-write") return toggleMode("write");
  if (action === "mode-shape") return toggleMode("shape");
  if (action === "toggle-outline") return toggleOutlineSidebar();
  if (action === "jump-node") return jumpToNode(nodeId);
  if (action === "lens-explore") return setLens("explore");
  if (action === "lens-refine") return setLens("refine");
  if (action === "toggle-collapse") return toggleCollapsed(nodeId);
  if (action === "add-heading") return revealHeading(nodeId);
  if (action === "select-node") {
    setSelectedNode(nodeId);
    render();
    restoreFocus({ nodeId, field: "row", offset: 0 });
    return;
  }
  if (action === "focus-node") return hoistNode(nodeId);
  if (action === "unhoist") return unhoist(target.dataset.nodeId || null);
  if (action === "move-up") return moveNode(nodeId, -1);
  if (action === "move-down") return moveNode(nodeId, 1);
  if (action === "indent") return indentNode(nodeId);
  if (action === "outdent") return outdentNode(nodeId);
  if (action === "duplicate") return duplicateNode(nodeId);
  if (action === "delete-node") return deleteNode(nodeId);
  if (action === "move-loose") return moveToLoose(nodeId);
  if (action === "return-manuscript") return returnToManuscript(nodeId);
  if (action === "new-root") return addRootNode();
  if (action === "copy-node") return quickCopyNode(nodeId);
  if (action === "copy") return openCopyDialog(nodeId || getCurrentNodeId());
  if (action === "margin") return openMargin();
  if (action === "close-margin") return closeMargin();
  if (action === "more") return openMoreDialog();
  if (action === "help") return openHelpDialog();
}

function revealHeading(nodeId) {
  const input = document.querySelector(`.node-heading[data-node-id="${CSS.escape(nodeId)}"]`);
  if (!input) return;
  input.classList.add("is-revealed");
  input.focus();
}

function toggleOutlineSidebar() {
  if (!state.book) return;
  state.book.view.outlineOpen = state.book.view.outlineOpen === false;
  render();
  scheduleSave();
}

function jumpToNode(nodeId) {
  if (!state.book || !findNode(nodeId)) return;
  const pathIds = getPath(nodeId).map((node) => node.id);
  state.book.view.collapsedIds = state.book.view.collapsedIds.filter((id) => !pathIds.includes(id));
  state.book.view.selectedNodeId = nodeId;
  if (state.book.view.mode !== "write") state.book.view.mode = "write";
  render();
  restoreFocus({ nodeId, field: "body", offset: 0 });
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
