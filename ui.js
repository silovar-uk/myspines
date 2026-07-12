function render() {
  if (!state.book) {
    renderLanding();
    return;
  }
  document.title = `${state.book.title} — myspines`;
  const mode = state.book.view.mode;
  app.innerHTML = `
    <div class="app-shell" data-mode="${mode}" data-lens="${state.book.view.lens}">
      <header class="topbar">
        <button class="brand-button" data-action="library" aria-label="本の一覧を開く">
          ${brandMarkup()}<span>myspines</span>
        </button>
        <input class="book-title-input" value="${escapeHtml(state.book.title)}" aria-label="本の題名" />
        <div class="topbar-actions">
          <div class="segmented desktop-only" aria-label="表示モード">
            <button data-action="mode-write" aria-pressed="${mode === "write"}">WRITE</button>
            <button data-action="mode-shape" aria-pressed="${mode === "shape"}">SHAPE</button>
          </div>
          <div class="segmented lens-toggle" aria-label="執筆レンズ">
            <button data-action="lens-explore" aria-pressed="${state.book.view.lens === "explore"}">ひろげる</button>
            <button data-action="lens-refine" aria-pressed="${state.book.view.lens === "refine"}">ととのえる</button>
          </div>
          <button class="icon-button desktop-only" data-action="copy" aria-label="コピー">複写</button>
          <button class="icon-button" data-action="more" aria-label="その他">•••</button>
        </div>
      </header>
      <div id="save-error-slot"></div>
      <div class="workspace-grid">
        <aside class="rail rail-left">
          <button class="rail-button" data-action="mode-shape">Spine</button>
        </aside>
        <main class="workspace-main">
          ${mode === "write" ? renderWriteMode() : renderShapeMode()}
        </main>
        <aside class="rail rail-right">
          <button class="rail-button" data-action="margin">Margin${hasAnyNotes() ? '<span class="rail-dot"></span>' : ""}</button>
        </aside>
      </div>
      ${renderMobileNav()}
      ${state.book.view.marginOpen ? renderMarginDrawer() : ""}
    </div>
  `;
  hydrateWriteBodies();
  attachCoreListeners();
  renderSaveError();
  updateQuietStatus();
}

function brandMarkup() {
  return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
}

function renderLanding() {
  document.title = "myspines";
  const existing = state.books.length
    ? `<div class="library-list">${state.books.map(renderLibraryItem).join("")}</div>`
    : "";
  app.innerHTML = `
    <main class="empty-state">
      <section class="empty-card">
        <div class="empty-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <h1>myspines</h1>
        <p class="empty-copy">本の背骨を、急かさず育てる静かな編集机。<br>まず一行を書くか、手元の原稿を持ち込むか。</p>
        <div class="empty-actions">
          <button class="primary-button" data-action="new-book">書き始める</button>
          <button class="secondary-button" data-action="import">原稿を持ち込む</button>
        </div>
        ${existing}
        <p class="privacy-note">原稿は、この端末のブラウザ内に保存されます。外部への送信は行いません。</p>
      </section>
    </main>
  `;
  attachCoreListeners();
}

function renderLibraryItem(book) {
  return `
    <div class="library-item">
      <button class="library-open" data-action="open-book" data-book-id="${book.id}">
        <span class="library-title">${escapeHtml(book.title)}</span>
        <span class="library-meta">${bookCharacters(book).toLocaleString("ja-JP")}字 ・ ${formatDate(book.updatedAt)}</span>
      </button>
      <button class="quiet-button" data-action="delete-book" data-book-id="${book.id}" aria-label="${escapeHtml(book.title)}を削除">外す</button>
    </div>
  `;
}

function renderWriteMode() {
  const hoistedId = state.book.view.hoistedNodeId;
  const hoisted = hoistedId ? findNode(hoistedId) : null;
  const roots = hoisted ? [hoisted] : state.book.manuscript;
  return `
    ${renderBreadcrumb()}
    <div class="manuscript-wrap">
      <article class="manuscript" aria-label="原稿本文">
        ${roots.map((node) => renderWriteNode(node, 0)).join("")}
      </article>
    </div>
    <div class="quiet-status" id="quiet-status"></div>
  `;
}

function renderBreadcrumb() {
  const hoistedId = state.book.view.hoistedNodeId;
  const path = hoistedId ? getPath(hoistedId) : [];
  const pieces = [`<button data-action="unhoist" data-node-id="">本全体</button>`];
  path.forEach((node, index) => {
    pieces.push("<span>›</span>");
    const parentId = index === path.length - 1 ? node.id : node.id;
    pieces.push(`<button data-action="unhoist" data-node-id="${parentId}">${escapeHtml(nodeLabel(node))}</button>`);
  });
  return `<div class="breadcrumb-row"><nav class="breadcrumb" aria-label="現在地">${pieces.join(" ")}</nav></div>`;
}

function renderWriteNode(node, depth) {
  const collapsed = state.book.view.collapsedIds.includes(node.id);
  const childCount = countDescendants(node);
  return `
    <section class="manuscript-node" data-node-id="${node.id}" data-depth="${Math.min(depth, 5)}">
      <div class="node-gutter" aria-label="段落操作">
        ${node.children.length ? `<button class="gutter-button" data-action="toggle-collapse" data-node-id="${node.id}" aria-label="${collapsed ? "展開" : "折り畳む"}">${collapsed ? "＋" : "−"}</button>` : ""}
        ${node.heading.trim() ? "" : `<button class="gutter-button" data-action="add-heading" data-node-id="${node.id}" aria-label="見出しを付ける">H</button>`}
        <button class="gutter-button copy-node" data-action="copy-node" data-node-id="${node.id}" aria-label="この段落をコピー">¶</button>
      </div>
      <input class="node-heading ${node.heading.trim() ? "" : "is-empty"}" data-node-id="${node.id}" value="${escapeHtml(node.heading)}" placeholder="見出し（任意）" aria-label="見出し（任意）" />
      <div class="node-body" data-node-id="${node.id}" contenteditable="plaintext-only" role="textbox" aria-multiline="true" spellcheck="true" lang="ja" data-placeholder="${node.body ? "" : "書き始める"}"></div>
      ${collapsed && childCount ? `<div class="collapsed-summary">配下${childCount}件を折り畳み中</div>` : ""}
      <div class="node-children" ${collapsed ? "hidden" : ""}>${node.children.map((child) => renderWriteNode(child, depth + 1)).join("")}</div>
    </section>
  `;
}

function renderShapeMode() {
  const selected = findNode(state.book.view.selectedNodeId);
  return `
    <div class="shape-wrap">
      <div class="shape-header">
        <div>
          <h1>本のかたち</h1>
          <p class="shape-subtitle">${state.book.manuscript.length}章・節の起点　${bookCharacters().toLocaleString("ja-JP")}字</p>
        </div>
        <button class="secondary-button" data-action="new-root">＋ 章・段落</button>
      </div>
      <div class="outline-section-title">Manuscript</div>
      <div class="outline-tree" role="tree">
        ${renderOutlineNodes(state.book.manuscript, 0, "manuscript")}
      </div>
      <div class="outline-section-title">未配置 <span>(${state.book.loose.length})</span></div>
      <div class="outline-tree loose-tree" role="tree">
        ${state.book.loose.length ? renderOutlineNodes(state.book.loose, 0, "loose") : '<p class="shape-subtitle">まだ居場所を決めていない文章はありません。</p>'}
      </div>
    </div>
    ${selected ? renderShapeActionbar(selected) : ""}
  `;
}

function renderOutlineNodes(nodes, depth, container) {
  const collapsed = new Set(state.book.view.collapsedIds);
  return nodes.map((node) => {
    const selected = state.book.view.selectedNodeId === node.id;
    const label = nodeLabel(node);
    const fallback = !node.heading.trim();
    const childRows = !collapsed.has(node.id) ? renderOutlineNodes(node.children, depth + 1, container) : "";
    return `
      <div class="outline-row ${selected ? "is-selected" : ""}" style="--depth:${depth}" data-node-id="${node.id}" data-container="${container}" role="treeitem" aria-expanded="${node.children.length ? !collapsed.has(node.id) : "false"}">
        <button class="outline-toggle" data-action="toggle-collapse" data-node-id="${node.id}" ${node.children.length ? "" : "disabled"} aria-label="${collapsed.has(node.id) ? "展開" : "折り畳む"}">${node.children.length ? (collapsed.has(node.id) ? "▸" : "▾") : "·"}</button>
        <button class="outline-label ${fallback ? "is-fallback" : ""}" data-action="select-node" data-node-id="${node.id}">${escapeHtml(label)}</button>
        <span class="outline-metrics">${subtreeCharacters(node).toLocaleString("ja-JP")}字</span>
      </div>
      ${childRows}
    `;
  }).join("");
}

function renderShapeActionbar(node) {
  const context = findNodeContext(node.id);
  const loose = context?.container === "loose";
  return `
    <div class="shape-actionbar" aria-label="選択中の項目を操作">
      <button class="action-button" data-action="focus-node" data-node-id="${node.id}">集中</button>
      <button class="action-button" data-action="move-up" data-node-id="${node.id}" aria-label="上へ移動">↑</button>
      <button class="action-button" data-action="move-down" data-node-id="${node.id}" aria-label="下へ移動">↓</button>
      <button class="action-button" data-action="outdent" data-node-id="${node.id}" aria-label="一段浅くする">←</button>
      <button class="action-button" data-action="indent" data-node-id="${node.id}" aria-label="一段深くする">→</button>
      <button class="action-button" data-action="copy" data-node-id="${node.id}">コピー</button>
      <button class="action-button" data-action="duplicate" data-node-id="${node.id}">複製</button>
      <button class="action-button" data-action="${loose ? "return-manuscript" : "move-loose"}" data-node-id="${node.id}">${loose ? "本文へ" : "未配置へ"}</button>
      <button class="action-button danger" data-action="delete-node" data-node-id="${node.id}">外す</button>
    </div>
  `;
}

function renderMobileNav() {
  return `
    <nav class="mobile-nav" aria-label="主要操作">
      <button data-action="mode-write" class="${state.book.view.mode === "write" ? "is-active" : ""}">本文</button>
      <button data-action="mode-shape" class="${state.book.view.mode === "shape" ? "is-active" : ""}">構造</button>
      <button data-action="margin">付箋</button>
      <button data-action="copy">コピー</button>
    </nav>
  `;
}

function renderMarginDrawer() {
  const nodeId = getCurrentNodeId();
  const node = findNode(nodeId);
  const nodeNote = nodeId ? state.book.notes.byNode[nodeId] ?? "" : "";
  return `
    <div class="drawer-backdrop" data-action="close-margin"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Margin">
      <div class="drawer-header">
        <div><h2>Margin</h2><div class="shape-subtitle">本文に入れない考えを置く場所</div></div>
        <button class="icon-button" data-action="close-margin" aria-label="閉じる">×</button>
      </div>
      <label class="field-label" for="next-thread">次の糸口</label>
      <input class="text-input" id="next-thread" data-note-scope="thread" value="${escapeHtml(state.book.nextThread)}" placeholder="次に戻った時、最初にやること" />
      <label class="field-label" for="global-note">本全体のメモ</label>
      <textarea class="textarea" id="global-note" data-note-scope="global" placeholder="本全体について覚えておきたいこと">${escapeHtml(state.book.notes.global)}</textarea>
      ${node ? `
        <label class="field-label" for="node-note">現在の項目：${escapeHtml(nodeLabel(node))}</label>
        <textarea class="textarea" id="node-note" data-note-scope="node" data-node-id="${node.id}" placeholder="この段落について覚えておきたいこと">${escapeHtml(nodeNote)}</textarea>
      ` : ""}
    </aside>
  `;
}

function hasAnyNotes() {
  if (!state.book) return false;
  return Boolean(state.book.notes.global.trim() || Object.values(state.book.notes.byNode).some((note) => String(note).trim()));
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
    state.book.title = title.value || "まだ題のない本";
    document.title = `${state.book.title} — myspines`;
    scheduleSave();
  });
  const manuscript = document.querySelector(".manuscript");
  if (manuscript) attachEditorListeners(manuscript);
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
    input.addEventListener("focus", () => { input.classList.add("is-revealed"); setSelectedNode(input.dataset.nodeId); });
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
