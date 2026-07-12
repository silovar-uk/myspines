function render() {
  if (!state.book) {
    renderLanding();
    return;
  }

  document.title = `${state.book.title} — myspines`;
  const mode = state.book.view.mode;
  const outlineOpen = state.book.view.outlineOpen !== false;

  app.innerHTML = `
    <div class="app-shell" data-mode="${mode}" data-outline-open="${outlineOpen}">
      <header class="editor-header">
        <button class="back-link" data-action="library">← 原稿一覧</button>
        <div class="editor-header__right">
          <span class="save-status">端末内に自動保存</span>
          <button class="icon-button" data-action="help" aria-label="ショートカット">?</button>
        </div>
      </header>

      <section class="editor-title-row" aria-label="原稿のタイトルと操作">
        <div class="title-block">
          <input class="book-title-input" value="${escapeHtml(state.book.title)}" aria-label="原稿のタイトル" />
          <div class="title-meta">${bookCharacters().toLocaleString("ja-JP")}字 ・ ${totalNodeCount()}項目</div>
        </div>
        <div class="editor-title-actions">
          ${mode === "write" ? `<button class="secondary-button desktop-only" data-action="toggle-outline" aria-pressed="${outlineOpen}">アウトライン</button>` : ""}
          <div class="segmented" aria-label="表示モード">
            <button data-action="mode-write" aria-pressed="${mode === "write"}">本文</button>
            <button data-action="mode-shape" aria-pressed="${mode === "shape"}">構成</button>
          </div>
          <button class="secondary-button" data-action="margin">メモ${hasAnyNotes() ? '<span class="button-dot" aria-hidden="true"></span>' : ""}</button>
          <button class="primary-button" data-action="more">書き出し</button>
        </div>
      </section>

      <div id="save-error-slot"></div>
      ${mode === "write" ? renderWriteMode() : renderShapeMode()}
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
  return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
}

function renderLanding() {
  document.title = "myspines";
  const existing = state.books.length
    ? `<section class="library-section"><div class="section-heading"><h2>最近の原稿</h2><span>${state.books.length}件</span></div><div class="library-list">${state.books.map(renderLibraryItem).join("")}</div></section>`
    : `<section class="library-empty"><p>まだ原稿はありません。</p></section>`;

  app.innerHTML = `
    <main class="library-page">
      <header class="library-header">
        <div class="brand">${brandMarkup()}<span>myspines</span></div>
        <span class="save-status">原稿はこの端末に保存されます</span>
      </header>

      <section class="library-hero">
        <div>
          <p class="eyebrow">LONG-FORM WRITING</p>
          <h1>長い文章を、<br>段落ごとに組み替えて書く。</h1>
          <p>本文を書きながらアウトラインを整理し、必要な範囲をAIへ渡せます。</p>
        </div>
        <div class="library-hero__actions">
          <button class="primary-button large-button" data-action="new-book">新しい原稿</button>
          <button class="secondary-button large-button" data-action="import">テキスト・Markdownを読み込む</button>
        </div>
      </section>

      ${existing}
    </main>
  `;

  attachCoreListeners();
}

function bookPreview(book) {
  const parts = [];
  walkNodes(book.manuscript, (node) => {
    if (parts.length >= 2) return;
    const text = (node.heading || node.body).replace(/\s+/gu, " ").trim();
    if (text) parts.push(text);
  });
  return parts;
}

function renderLibraryItem(book) {
  const preview = bookPreview(book);
  return `
    <article class="library-item">
      <button class="library-open" data-action="open-book" data-book-id="${book.id}">
        <span class="library-title">${escapeHtml(book.title)}</span>
        <span class="library-meta">${bookCharacters(book).toLocaleString("ja-JP")}字 ・ ${formatDate(book.updatedAt)}</span>
        ${preview.length ? `<span class="library-preview">${preview.map((text) => escapeHtml(text)).join("　／　")}</span>` : ""}
      </button>
      <button class="quiet-button library-delete" data-action="delete-book" data-book-id="${book.id}" aria-label="${escapeHtml(book.title)}を削除">削除</button>
    </article>
  `;
}

function renderWriteMode() {
  const hoistedId = state.book.view.hoistedNodeId;
  const hoisted = hoistedId ? findNode(hoistedId) : null;
  const roots = hoisted ? [hoisted] : state.book.manuscript;
  const outlineOpen = state.book.view.outlineOpen !== false;

  return `
    <div class="write-layout ${outlineOpen ? "is-outline-open" : "is-outline-closed"}">
      <aside class="outline-panel" aria-label="アウトライン">
        ${renderOutlinePanel()}
      </aside>
      <main class="manuscript-panel">
        <div class="manuscript-panel__header">
          ${renderBreadcrumb()}
          <button class="text-button" data-action="new-root">＋ 段落を追加</button>
        </div>
        <div class="manuscript-wrap">
          <article class="manuscript" aria-label="原稿本文">
            ${roots.map((node) => renderWriteNode(node, 0)).join("")}
          </article>
        </div>
        <div class="document-status" id="quiet-status"></div>
      </main>
    </div>
  `;
}

function renderOutlinePanel() {
  return `
    <div class="outline-panel__header">
      <div>
        <h2>アウトライン</h2>
        <p>${bookCharacters().toLocaleString("ja-JP")}字</p>
      </div>
      <button class="icon-button" data-action="toggle-outline" aria-label="アウトラインを閉じる">×</button>
    </div>
    <div class="sidebar-tree" role="tree">
      ${renderSidebarNodes(state.book.manuscript, 0, "manuscript")}
    </div>
    <div class="outline-panel__footer">
      <button class="secondary-button full-button" data-action="new-root">＋ 項目を追加</button>
      ${state.book.loose.length ? `<div class="sidebar-section-label">未配置 ${state.book.loose.length}</div><div class="sidebar-tree sidebar-tree--loose">${renderSidebarNodes(state.book.loose, 0, "loose")}</div>` : ""}
    </div>
  `;
}

function renderSidebarNodes(nodes, depth, container) {
  const collapsed = new Set(state.book.view.collapsedIds);
  return nodes.map((node) => {
    const selected = state.book.view.selectedNodeId === node.id;
    const hasChildren = node.children.length > 0;
    const childRows = !collapsed.has(node.id) ? renderSidebarNodes(node.children, depth + 1, container) : "";
    return `
      <div class="sidebar-row ${selected ? "is-selected" : ""}" style="--depth:${depth}" data-node-id="${node.id}" role="treeitem">
        <button class="sidebar-toggle" data-action="toggle-collapse" data-node-id="${node.id}" ${hasChildren ? "" : "disabled"} aria-label="${collapsed.has(node.id) ? "展開" : "折り畳む"}">${hasChildren ? (collapsed.has(node.id) ? "▸" : "▾") : ""}</button>
        <button class="sidebar-label" data-action="jump-node" data-node-id="${node.id}">${escapeHtml(nodeLabel(node))}</button>
        <span class="sidebar-count">${subtreeCharacters(node).toLocaleString("ja-JP")}</span>
      </div>
      ${childRows}
    `;
  }).join("");
}

function renderBreadcrumb() {
  const currentId = state.book.view.hoistedNodeId || state.book.view.selectedNodeId;
  const path = currentId ? getPath(currentId) : [];
  const pieces = [`<button data-action="unhoist" data-node-id="">本全体</button>`];
  path.forEach((node) => {
    pieces.push("<span>›</span>");
    pieces.push(`<button data-action="jump-node" data-node-id="${node.id}">${escapeHtml(nodeLabel(node))}</button>`);
  });
  return `<nav class="breadcrumb" aria-label="現在地">${pieces.join(" ")}</nav>`;
}
