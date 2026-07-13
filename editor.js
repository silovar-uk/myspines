function attachEditorListeners(manuscript) {
  manuscript.addEventListener("focusin", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    setSelectedNode(body.dataset.nodeId);
    if (typeof refreshMemoNodeField === "function") {
      refreshMemoNodeField(body.dataset.nodeId);
    }
  });

  manuscript.addEventListener("compositionstart", (event) => {
    const body = event.target.closest?.(".node-body");
    if (!body) return;
    state.composing = true;
    if (!state.compositionCaptured) {
      pushHistory("日本語入力");
      state.compositionCaptured = true;
      state.inputGroup = {
        nodeId: body.dataset.nodeId,
        field: "body",
        time: Date.now(),
      };
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

    if (
      (event.inputType === "historyUndo" ||
        event.inputType === "historyRedo") &&
      !state.composing
    ) {
      event.preventDefault();
      event.inputType === "historyUndo" ? undo() : redo();
      return;
    }

    if (
      state.composing ||
      event.isComposing ||
      event.inputType === "insertCompositionText"
    )
      return;

    if (
      event.inputType === "insertParagraph" ||
      event.inputType === "insertLineBreak"
    ) {
      event.preventDefault();
      insertSoftBreak(body, nodeId, selection);
      return;
    }

    if (
      event.inputType === "deleteContentBackward" &&
      selection?.collapsed &&
      selection.start === 0
    ) {
      if (joinBackward(nodeId)) event.preventDefault();
      return;
    }

    if (
      event.inputType === "deleteContentForward" &&
      selection?.collapsed &&
      selection.start === body.textContent.length
    ) {
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

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      const selection = getSelectionOffsets(body);
      splitNode(nodeId, selection?.start ?? body.textContent.length);
      return;
    }

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

function insertSoftBreak(body, nodeId, selection) {
  const node = findNode(nodeId);
  if (!node) return;
  const start = Math.max(
    0,
    Math.min(selection?.start ?? node.body.length, node.body.length),
  );
  const end = Math.max(
    start,
    Math.min(selection?.end ?? start, node.body.length),
  );

  beginInputHistory(nodeId, "body");
  node.body = `${node.body.slice(0, start)}\n${node.body.slice(end)}`;
  state.book.view.selectedNodeId = nodeId;
  render();
  restoreFocus({ nodeId, field: "body", offset: start + 1 });
  scheduleSave();
}

function syncBodyFromElement(body) {
  const node = findNode(body.dataset.nodeId);
  if (!node) return;
  node.body = body.innerText.replace(/\r\n?/g, "\n");
  setSelectedNode(node.id);
  if (typeof refreshMemoNodeField === "function") {
    refreshMemoNodeField(node.id);
  }
  scheduleSave();
  updateQuietStatus();
}
