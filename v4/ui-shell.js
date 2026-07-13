function render() {
  if (!state.book) {
    renderLanding();
    return;
  }

  document.title = `${state.book.title} — myspines`;
  const mode = state.book.view.mode;
  const outlineOpen = state.book.view.outlineOpen !== false;
  const memoOpen = state.book.view.memoOpen === true;

  app.innerHTML = `
    <div class="app-shell" data-mode="${mode}" data-outline-open="${outlineOpen}" data-memo-open="${memoOpen}">
      <header class="global-header">
        <div class="global-header__left">
          <button class="back-link" data-action="library">← 原稿一覧</button>
          ${
            mode === "write"
              ? `<button class="pane-toggle" data-action="toggle-outline" aria-pressed="${outlineOpen}"><span aria-hidden="true">☰</span><span>アウトライン</span></button>`
              : `<span class="global-document-name">${escapeHtml(state.book.title)}</span>`
          }
        </div>
        <div class="segmented" aria-label="表示モード">
          <button data-action="mode-write" aria-pressed="${mode === "write"}">本文</button>
          <button data-action="mode-shape" aria-pressed="${mode === "shape"}">構成</button>
        </div>
        <div class="global-header__right">
          <span class="save-status">自動保存</span>
          <button class="pane-toggle" data-action="toggle-memo" aria-pressed="${memoOpen}">
            <span>メモ</span>${hasAnyNotes() ? '<span class="button-dot" aria-hidden="true"></span>' : ""}
          </button>
          <button class="primary-button header-action" data-action="more">書き出し</button>
          <button class="icon-button" data-action="help" aria-label="ショートカット">?</button>
        </div>
      </header>

      <div id="save-error-slot"></div>
      <div class="workspace-frame mode-${mode} ${outlineOpen ? "is-outline-open" : "is-outline-closed"} ${memoOpen ? "is-memo-open" : "is-memo-closed"}" style="--outline-width:${clampOutlineWidth(state.book.view.outlineWidth)}px">
        ${mode === "write" ? renderWriteMode() : renderShapeMode()}
        ${memoOpen ? renderMemoPane() : ""}
      </div>
      ${renderMobileNav()}
      ${renderParagraphSheet()}
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
          <h1>長い文章を、<br>構造を見ながら書く。</h1>
          <p>本文、番号付きアウトライン、メモを一つの画面で扱えます。</p>
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
  const outlineWidth = clampOutlineWidth(state.book.view.outlineWidth);

  return `
    <button class="outline-backdrop" data-action="close-outline" aria-label="アウトラインを閉じる"></button>
    <aside class="outline-pane" aria-label="アウトライン">
      ${renderOutlinePanel()}
      <div class="outline-resizer" data-outline-resizer role="separator" tabindex="0" aria-label="アウトラインの幅" aria-orientation="vertical" aria-valuemin="220" aria-valuemax="380" aria-valuenow="${outlineWidth}"></div>
    </aside>
    <main class="document-pane">
      <header class="document-header">
        <div class="document-axis">
          <input class="book-title-input" value="${escapeHtml(state.book.title)}" aria-label="原稿のタイトル" />
          <div class="document-meta-row">
            <div class="title-meta">${bookCharacters().toLocaleString("ja-JP")}字 ・ ${totalNodeCount()}項目</div>
            <button class="text-button" data-action="new-root">＋ 項目を追加</button>
          </div>
          ${renderBreadcrumb()}
        </div>
      </header>
      <div class="manuscript-region">
        <article class="manuscript document-axis" aria-label="原稿本文">
          ${roots.map((node) => renderWriteNode(node, 0)).join("")}
        </article>
      </div>
      <footer class="document-status" id="quiet-status"></footer>
    </main>
  `;
}

function renderOutlinePanel() {
  return `
    <div class="outline-pane__header">
      <div>
        <h2>アウトライン</h2>
        <p>${totalNodeCount()}項目</p>
      </div>
      <button class="icon-button" data-action="close-outline" aria-label="アウトラインを閉じる">×</button>
    </div>
    <div class="sidebar-tree" role="tree">
      ${renderSidebarNodes(state.book.manuscript, [], "manuscript")}
    </div>
    <div class="outline-pane__footer">
      <button class="secondary-button full-button" data-action="new-root">＋ 項目を追加</button>
      ${
        state.book.loose.length
          ? `<div class="sidebar-section-label">未配置 ${state.book.loose.length}</div><div class="sidebar-tree sidebar-tree--loose">${renderSidebarNodes(state.book.loose, [], "loose")}</div>`
          : ""
      }
    </div>
  `;
}

function renderSidebarNodes(nodes, prefix, container) {
  const collapsed = new Set(state.book.view.collapsedIds);
  return nodes
    .map((node, index) => {
      const path = [...prefix, index + 1];
      const number = container === "manuscript" ? formatOutlineNumber(path) : "—";
      const selected = state.book.view.selectedNodeId === node.id;
      const hasChildren = node.children.length > 0;
      const childRows = !collapsed.has(node.id)
        ? renderSidebarNodes(node.children, path, container)
        : "";
      return `
        <div class="sidebar-row ${selected ? "is-selected" : ""}" style="--depth:${path.length - 1}" data-node-id="${node.id}" role="treeitem">
          <button class="sidebar-toggle" data-action="toggle-collapse" data-node-id="${node.id}" ${hasChildren ? "" : "disabled"} aria-label="${collapsed.has(node.id) ? "展開" : "折り畳む"}">${hasChildren ? (collapsed.has(node.id) ? "▸" : "▾") : ""}</button>
          <span class="sidebar-number">${number}</span>
          <button class="sidebar-label" data-action="jump-node" data-node-id="${node.id}">${escapeHtml(nodeLabel(node))}</button>
        </div>
        ${childRows}
      `;
    })
    .join("");
}

function renderBreadcrumb() {
  const currentId = state.book.view.hoistedNodeId || state.book.view.selectedNodeId;
  const path = currentId ? getPath(currentId) : [];
  const pieces = [`<button data-action="unhoist" data-node-id="">本全体</button>`];
  path.forEach((node) => {
    const number = outlineNumberForNode(node.id);
    pieces.push("<span>›</span>");
    pieces.push(`<button data-action="jump-node" data-node-id="${node.id}">${number ? `<b>${number}</b> ` : ""}${escapeHtml(nodeLabel(node))}</button>`);
  });
  return `<nav class="breadcrumb" aria-label="現在地">${pieces.join(" ")}</nav>`;
}

function renderMemoPane() {
  const nodeId = getCurrentNodeId();
  const node = findNode(nodeId);
  const nodeNote = nodeId ? state.book.notes.byNode[nodeId] ?? "" : "";
  const nodeNumber = nodeId ? outlineNumberForNode(nodeId) : "";

  return `
    <button class="memo-backdrop" data-action="close-memo" aria-label="メモを閉じる"></button>
    <aside class="memo-pane" aria-label="メモ">
      <div class="memo-pane__header">
        <div><h2>メモ</h2><p>本文とは別に保存</p></div>
        <button class="icon-button" data-action="close-memo" aria-label="メモを閉じる">×</button>
      </div>
      <div class="memo-pane__content">
        <label class="memo-field memo-field--next" for="next-thread">
          <span>次に書くこと</span>
          <input class="text-input" id="next-thread" data-note-scope="thread" value="${escapeHtml(state.book.nextThread)}" placeholder="再開時の最初の一手" />
        </label>
        ${
          node
            ? `<label class="memo-field" for="node-note"><span>${nodeNumber ? `${nodeNumber} ` : ""}${escapeHtml(nodeLabel(node))}</span><textarea class="textarea" id="node-note" data-note-scope="node" data-node-id="${node.id}" placeholder="この項目の論点、根拠、修正メモ">${escapeHtml(nodeNote)}</textarea></label>`
            : ""
        }
        <label class="memo-field" for="global-note">
          <span>原稿全体</span>
          <textarea class="textarea" id="global-note" data-note-scope="global" placeholder="構成方針、資料、確認事項">${escapeHtml(state.book.notes.global)}</textarea>
        </label>
      </div>
    </aside>
  `;
}
