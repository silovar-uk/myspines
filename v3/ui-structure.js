function renderWriteNode(node, depth) {
  const collapsed = state.book.view.collapsedIds.includes(node.id);
  const childCount = countDescendants(node);
  const hasHeading = Boolean(node.heading.trim());

  return `
    <section class="manuscript-node ${hasHeading ? "has-heading" : ""}" data-node-id="${node.id}" data-depth="${Math.min(depth, 5)}">
      <div class="node-gutter" aria-label="段落操作">
        ${node.children.length ? `<button class="gutter-action" data-action="toggle-collapse" data-node-id="${node.id}" aria-label="${collapsed ? "展開" : "折り畳む"}" title="${collapsed ? "展開" : "折り畳む"}">${collapsed ? "▸" : "▾"}</button>` : '<span class="gutter-spacer"></span>'}
        ${hasHeading ? "" : `<button class="gutter-action" data-action="add-heading" data-node-id="${node.id}" aria-label="見出しを付ける" title="見出しを付ける">H</button>`}
        <button class="gutter-action" data-action="copy-node" data-node-id="${node.id}" aria-label="この段落をコピー" title="この段落をコピー">⧉</button>
      </div>
      <button class="paragraph-menu-trigger" data-action="paragraph-menu" data-node-id="${node.id}" aria-label="段落の操作">•••</button>
      <input class="node-heading ${hasHeading ? "" : "is-empty"}" data-node-id="${node.id}" value="${escapeHtml(node.heading)}" placeholder="見出し（任意）" aria-label="見出し（任意）" />
      <div class="node-body" data-node-id="${node.id}" contenteditable="plaintext-only" role="textbox" aria-multiline="true" spellcheck="true" lang="ja" data-placeholder="${node.body ? "" : "本文を書く"}"></div>
      ${collapsed && childCount ? `<button class="collapsed-summary" data-action="toggle-collapse" data-node-id="${node.id}">配下${childCount}件を表示</button>` : ""}
      <div class="node-children" ${collapsed ? "hidden" : ""}>${node.children.map((child) => renderWriteNode(child, depth + 1)).join("")}</div>
    </section>
  `;
}

function nodeExcerpt(node) {
  const text = node.body.replace(/\s+/gu, " ").trim();
  if (!text) return "本文なし";
  const chars = Array.from(text);
  return chars.length > 76 ? `${chars.slice(0, 75).join("")}…` : text;
}

function renderShapeMode() {
  const selected = findNode(state.book.view.selectedNodeId);
  return `
    <main class="structure-page">
      <div class="structure-toolbar">
        <div>
          <h1>構成</h1>
          <p>${totalNodeCount()}項目 ・ ${bookCharacters().toLocaleString("ja-JP")}字</p>
        </div>
        <div class="structure-toolbar__actions">
          <button class="secondary-button" data-action="collapse-all">すべて折り畳む</button>
          <button class="secondary-button" data-action="expand-all">すべて展開</button>
          <button class="primary-button" data-action="new-root">＋ 項目を追加</button>
        </div>
      </div>
      <div class="structure-layout">
        <section class="structure-board">
          <div class="structure-section-heading"><h2>本文</h2><span>${state.book.manuscript.length}起点</span></div>
          ${renderStructureTableHeader()}
          <div class="structure-tree" role="tree">
            ${renderOutlineNodes(state.book.manuscript, 0, "manuscript")}
          </div>
          <div class="structure-section-heading structure-section-heading--loose"><h2>未配置</h2><span>${state.book.loose.length}件</span></div>
          ${state.book.loose.length ? renderStructureTableHeader() : ""}
          <div class="structure-tree loose-tree" role="tree">
            ${state.book.loose.length ? renderOutlineNodes(state.book.loose, 0, "loose") : '<p class="empty-inline">未配置の文章はありません。</p>'}
          </div>
        </section>
        ${selected ? renderShapeInspector(selected) : '<aside class="selection-panel"><p>項目を選ぶと操作が表示されます。</p></aside>'}
      </div>
    </main>
  `;
}

function renderStructureTableHeader() {
  return `
    <div class="structure-table-header" aria-hidden="true">
      <span></span><span>項目</span><span>本文冒頭</span><span>文字数</span>
    </div>
  `;
}

function renderOutlineNodes(nodes, depth, container) {
  const collapsed = new Set(state.book.view.collapsedIds);
  return nodes.map((node) => {
    const selected = state.book.view.selectedNodeId === node.id;
    const fallback = !node.heading.trim();
    const hasChildren = node.children.length > 0;
    const childRows = !collapsed.has(node.id) ? renderOutlineNodes(node.children, depth + 1, container) : "";
    return `
      <div class="structure-row ${selected ? "is-selected" : ""}" data-node-id="${node.id}" data-container="${container}" role="treeitem" aria-expanded="${hasChildren ? !collapsed.has(node.id) : "false"}">
        <button class="outline-toggle" data-action="toggle-collapse" data-node-id="${node.id}" ${hasChildren ? "" : "disabled"} aria-label="${collapsed.has(node.id) ? "展開" : "折り畳む"}">${hasChildren ? (collapsed.has(node.id) ? "▸" : "▾") : ""}</button>
        <button class="structure-title-cell ${fallback ? "is-fallback" : ""}" style="--depth:${depth}" data-action="select-node" data-node-id="${node.id}">
          <span class="structure-title">${escapeHtml(nodeLabel(node))}</span>
          ${hasChildren ? `<span class="structure-descendants">配下${countDescendants(node)}件</span>` : ""}
        </button>
        <button class="structure-excerpt" data-action="select-node" data-node-id="${node.id}">${escapeHtml(nodeExcerpt(node))}</button>
        <span class="structure-metrics"><strong>${ownNodeCharacters(node).toLocaleString("ja-JP")}</strong>${hasChildren ? `<small>全体${subtreeCharacters(node).toLocaleString("ja-JP")}</small>` : ""}</span>
      </div>
      ${childRows}
    `;
  }).join("");
}

function renderShapeInspector(node) {
  const context = findNodeContext(node.id);
  const loose = context?.container === "loose";
  return `
    <aside class="selection-panel" aria-label="選択中の項目を操作">
      <div class="selection-panel__heading">
        <span>選択中</span>
        <h2>${escapeHtml(nodeLabel(node))}</h2>
        <p>${subtreeCharacters(node).toLocaleString("ja-JP")}字 ・ 配下${countDescendants(node)}件</p>
      </div>
      <button class="primary-button full-button" data-action="focus-node" data-node-id="${node.id}">本文を開く</button>
      <div class="movement-grid" aria-label="位置を変更">
        <button class="secondary-button" data-action="move-up" data-node-id="${node.id}">↑ 上へ</button>
        <button class="secondary-button" data-action="move-down" data-node-id="${node.id}">↓ 下へ</button>
        <button class="secondary-button" data-action="outdent" data-node-id="${node.id}">← 浅く</button>
        <button class="secondary-button" data-action="indent" data-node-id="${node.id}">→ 深く</button>
      </div>
      <div class="selection-panel__secondary">
        <button class="text-button" data-action="copy" data-node-id="${node.id}">コピー</button>
        <button class="text-button" data-action="duplicate" data-node-id="${node.id}">複製</button>
        <button class="text-button" data-action="${loose ? "return-manuscript" : "move-loose"}" data-node-id="${node.id}">${loose ? "本文へ戻す" : "未配置へ移動"}</button>
        <button class="text-button danger-text" data-action="delete-node" data-node-id="${node.id}">削除</button>
      </div>
    </aside>
  `;
}

function renderParagraphSheet() {
  const nodeId = state.paragraphMenuNodeId;
  const node = nodeId ? findNode(nodeId) : null;
  if (!node) return "";
  const collapsed = state.book.view.collapsedIds.includes(node.id);
  const context = findNodeContext(node.id);
  const loose = context?.container === "loose";
  return `
    <button class="paragraph-sheet-backdrop" data-action="close-paragraph-menu" aria-label="段落操作を閉じる"></button>
    <aside class="paragraph-sheet" role="dialog" aria-modal="true" aria-label="段落操作">
      <div class="paragraph-sheet__header">
        <div><span>段落</span><strong>${escapeHtml(nodeLabel(node))}</strong></div>
        <button class="icon-button" data-action="close-paragraph-menu" aria-label="閉じる">×</button>
      </div>
      <div class="paragraph-sheet__actions">
        ${node.heading.trim() ? "" : `<button class="secondary-button" data-action="add-heading" data-node-id="${node.id}">見出しを付ける</button>`}
        ${node.children.length ? `<button class="secondary-button" data-action="toggle-collapse" data-node-id="${node.id}">${collapsed ? "配下を表示" : "配下を折り畳む"}</button>` : ""}
        <button class="secondary-button" data-action="copy-node" data-node-id="${node.id}">コピー</button>
        <button class="secondary-button" data-action="${loose ? "return-manuscript" : "move-loose"}" data-node-id="${node.id}">${loose ? "本文へ戻す" : "未配置へ移動"}</button>
        <button class="danger-button" data-action="delete-node" data-node-id="${node.id}">削除</button>
      </div>
    </aside>
  `;
}

function renderMobileNav() {
  return `
    <nav class="mobile-nav" aria-label="主要操作">
      <button data-action="mode-write" class="${state.book.view.mode === "write" ? "is-active" : ""}">本文</button>
      <button data-action="mode-shape" class="${state.book.view.mode === "shape" ? "is-active" : ""}">構成</button>
      <button data-action="margin" class="${state.book.view.marginOpen ? "is-active" : ""}">メモ</button>
    </nav>
  `;
}

function renderMarginDrawer() {
  const nodeId = getCurrentNodeId();
  const node = findNode(nodeId);
  const nodeNote = nodeId ? state.book.notes.byNode[nodeId] ?? "" : "";
  return `
    <div class="drawer-backdrop" data-action="close-margin"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="メモ">
      <div class="drawer-header">
        <div><h2>メモ</h2><div class="drawer-subtitle">本文に入れない情報を保存します。</div></div>
        <button class="icon-button" data-action="close-margin" aria-label="閉じる">×</button>
      </div>
      <label class="field-label" for="next-thread">次に書くこと</label>
      <input class="text-input" id="next-thread" data-note-scope="thread" value="${escapeHtml(state.book.nextThread)}" placeholder="次回、最初に取りかかる内容" />
      <label class="field-label" for="global-note">原稿全体のメモ</label>
      <textarea class="textarea" id="global-note" data-note-scope="global" placeholder="構成方針、確認事項、資料など">${escapeHtml(state.book.notes.global)}</textarea>
      ${node ? `
        <label class="field-label" for="node-note">選択中：${escapeHtml(nodeLabel(node))}</label>
        <textarea class="textarea" id="node-note" data-note-scope="node" data-node-id="${node.id}" placeholder="この項目に関するメモ">${escapeHtml(nodeNote)}</textarea>
      ` : ""}
    </aside>
  `;
}

function hasAnyNotes() {
  if (!state.book) return false;
  return Boolean(state.book.nextThread.trim() || state.book.notes.global.trim() || Object.values(state.book.notes.byNode).some((note) => String(note).trim()));
}

function hydrateWriteBodies() {
  if (!state.book || state.book.view.mode !== "write") return;
  document.querySelectorAll(".node-body[data-node-id]").forEach((element) => {
    const node = findNode(element.dataset.nodeId);
    if (node) element.textContent = node.body;
  });
}

function attachCoreListeners() {
  if (!app.dataset.clickBound) {
    app.addEventListener("click", handleClick);
    app.dataset.clickBound = "true";
  }

  const title = document.querySelector(".book-title-input");
  title?.addEventListener("input", () => {
    state.book.title = title.value || "無題の原稿";
    document.title = `${state.book.title} — myspines`;
    scheduleSave();
  });

  const manuscript = document.querySelector(".manuscript");
  if (manuscript) attachEditorListeners(manuscript);
  attachOutlineResizer();

  document.querySelectorAll(".node-heading").forEach((input) => {
    input.addEventListener("compositionstart", () => {
      state.composing = true;
      if (!state.compositionCaptured) {
        pushHistory("日本語入力");
        state.compositionCaptured = true;
        state.inputGroup = { nodeId: input.dataset.nodeId, field: "heading", time: Date.now() };
      }
    });
    input.addEventListener("compositionend", () => {
      state.composing = false;
      state.compositionCaptured = false;
      state.inputGroup = null;
    });
    input.addEventListener("beforeinput", (event) => {
      if (state.composing || event.isComposing || event.inputType === "insertCompositionText") return;
      beginInputHistory(input.dataset.nodeId, "heading");
    });
    input.addEventListener("input", () => {
      const node = findNode(input.dataset.nodeId);
      if (!node) return;
      node.heading = input.value;
      input.classList.toggle("is-empty", !input.value.trim());
      setSelectedNode(node.id);
      scheduleSave();
    });
    input.addEventListener("focus", () => {
      input.classList.add("is-revealed");
      setSelectedNode(input.dataset.nodeId);
    });
    input.addEventListener("blur", () => input.classList.remove("is-revealed"));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        const body = document.querySelector(`.node-body[data-node-id="${CSS.escape(input.dataset.nodeId)}"]`);
        body?.focus();
        setCaretOffset(body, 0);
      }
    });
  });

  document.querySelectorAll("[data-note-scope]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      if (textarea.dataset.noteScope === "thread") state.book.nextThread = textarea.value;
      else if (textarea.dataset.noteScope === "global") state.book.notes.global = textarea.value;
      else state.book.notes.byNode[textarea.dataset.nodeId] = textarea.value;
      scheduleSave();
    });
  });
}

function attachOutlineResizer() {
  const resizer = document.querySelector("[data-outline-resizer]");
  const shell = document.querySelector(".write-shell");
  if (!resizer || !shell) return;

  const applyWidth = (value, persist = false) => {
    const width = clampOutlineWidth(value);
    shell.style.setProperty("--outline-width", `${width}px`);
    resizer.setAttribute("aria-valuenow", String(width));
    if (persist) {
      state.book.view.outlineWidth = width;
      scheduleSave();
    }
  };

  resizer.addEventListener("pointerdown", (event) => {
    if (window.innerWidth < 1040) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = clampOutlineWidth(state.book.view.outlineWidth);
    document.documentElement.classList.add("is-resizing-outline");
    resizer.setPointerCapture?.(event.pointerId);

    const move = (moveEvent) => applyWidth(startWidth + moveEvent.clientX - startX);
    const finish = (upEvent) => {
      resizer.releasePointerCapture?.(upEvent.pointerId);
      resizer.removeEventListener("pointermove", move);
      resizer.removeEventListener("pointerup", finish);
      resizer.removeEventListener("pointercancel", finish);
      document.documentElement.classList.remove("is-resizing-outline");
      applyWidth(parseFloat(getComputedStyle(shell).getPropertyValue("--outline-width")), true);
    };

    resizer.addEventListener("pointermove", move);
    resizer.addEventListener("pointerup", finish);
    resizer.addEventListener("pointercancel", finish);
  });

  resizer.addEventListener("keydown", (event) => {
    const current = clampOutlineWidth(state.book.view.outlineWidth);
    let next = null;
    if (event.key === "ArrowLeft") next = current - 12;
    if (event.key === "ArrowRight") next = current + 12;
    if (event.key === "Home") next = 220;
    if (event.key === "End") next = 400;
    if (next === null) return;
    event.preventDefault();
    applyWidth(next, true);
  });
}
