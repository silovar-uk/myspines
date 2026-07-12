function attachEditorListeners(manuscript) {
  manuscript.addEventListener("focusin", (event) => {
    const body = event.target.closest?.(".node-body");
    if (body) setSelectedNode(body.dataset.nodeId);
  });

  manuscript.addEventListener("compositionstart", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    state.composing = true;
    if (!state.compositionCaptured) {
      pushHistory("日本語入力");
      state.compositionCaptured = true;
      state.inputGroup = { nodeId: body.dataset.nodeId, field: "body", time: Date.now() };
    }
  });

  manuscript.addEventListener("compositionend", (event) => {
    const body = event.target.closest?.(".node-body");
    if (body) syncBodyFromElement(body);
    state.composing = false;
    state.compositionCaptured = false;
    state.inputGroup = null;
  });

  manuscript.addEventListener("beforeinput", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    const nodeId = body.dataset.nodeId;
    const selection = getSelectionOffsets(body);
    if ((event.inputType === "historyUndo" || event.inputType === "historyRedo") && !state.composing) {
      event.preventDefault();
      event.inputType === "historyUndo" ? undo() : redo();
      return;
    }
    if (state.composing || event.isComposing || event.inputType === "insertCompositionText") return;
    if (event.inputType === "insertParagraph") {
      event.preventDefault();
      splitNode(nodeId, selection?.start ?? body.textContent.length);
      return;
    }
    if (event.inputType === "deleteContentBackward" && selection?.collapsed && selection.start === 0) {
      if (joinBackward(nodeId)) event.preventDefault();
      return;
    }
    if (event.inputType === "deleteContentForward" && selection?.collapsed && selection.start === body.textContent.length) {
      if (joinForward(nodeId)) event.preventDefault();
      return;
    }
    beginInputHistory(nodeId, "body");
  });

  manuscript.addEventListener("input", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    syncBodyFromElement(body);
  });

  manuscript.addEventListener("paste", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const node = findNode(body.dataset.nodeId);
    const blocks = splitIntoParagraphBlocks(text);
    if (node && !node.body.trim() && blocks.length > 1) {
      state.pendingPaste = { nodeId: node.id, blocks };
      setTimeout(() => showPasteSuggestion(node.id, blocks), 20);
    }
  });

  manuscript.addEventListener("keydown", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body || event.isComposing || state.composing) return;
    const nodeId = body.dataset.nodeId;
    if (event.key === "Tab") {
      event.preventDefault();
      event.shiftKey ? outdentNode(nodeId) : indentNode(nodeId);
      return;
    }
    if (event.altKey && event.shiftKey && event.key === "ArrowUp") {
      event.preventDefault();
      moveNode(nodeId, -1);
      return;
    }
    if (event.altKey && event.shiftKey && event.key === "ArrowDown") {
      event.preventDefault();
      moveNode(nodeId, 1);
    }
  });
}

function syncBodyFromElement(body) {
  const node = findNode(body.dataset.nodeId);
  if (!node) return;
  node.body = body.innerText.replace(/\r\n?/g, "\n");
  setSelectedNode(node.id);
  scheduleSave();
  updateQuietStatus();
}

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

function addRootNode() {
  const node = createNode();
  mutateStructure("章・段落を追加", () => {
    state.book.manuscript.push(node);
    state.book.view.selectedNodeId = node.id;
  }, { nodeId: node.id, field: "row", offset: 0 });
}
