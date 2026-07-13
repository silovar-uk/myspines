function renderHeadingNumberControl() {
  const visible = state.book.view.showHeadingNumbers !== false;
  return `
    <button class="heading-number-toggle" data-action="toggle-heading-numbers" aria-pressed="${visible}">
      <span>見出し番号</span><strong>${visible ? "表示" : "非表示"}</strong>
    </button>
  `;
}

function renderWriteMode() {
  const hoistedId = state.book.view.hoistedNodeId;
  const hoisted = hoistedId ? findNode(hoistedId) : null;
  const roots = hoisted ? [hoisted] : state.book.manuscript;
  const outlineWidth = clampOutlineWidth(state.book.view.outlineWidth);

  return `
    <button class="outline-backdrop" data-action="close-outline" aria-label="アウトラインを閉じる"></button>
    <aside class="outline-pane" aria-label="アウトライン">
      ${renderOutlinePanel()}
      <div class="outline-resizer" data-outline-resizer role="separator" tabindex="0" aria-label="アウトラインの幅" aria-orientation="vertical" aria-valuemin="200" aria-valuemax="340" aria-valuenow="${outlineWidth}"></div>
    </aside>
    <main class="document-pane">
      <header class="document-header">
        <div class="document-axis">
          <input class="book-title-input" value="${escapeHtml(state.book.title)}" aria-label="原稿のタイトル" />
          <div class="document-meta-row">
            <div class="title-meta">
              <span class="title-character-count">タイトル ${countCharacters(state.book.title).toLocaleString("ja-JP")}字</span>
              <span aria-hidden="true">・</span>
              <span class="body-character-count">本文 ${bookCharacters().toLocaleString("ja-JP")}字</span>
              <span aria-hidden="true">・</span>
              <span>${totalNodeCount()}項目</span>
            </div>
            <div class="document-meta-actions">
              ${renderHeadingNumberControl()}
              <button class="text-button" data-action="new-root">＋ 項目を追加</button>
            </div>
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

function renderWriteNode(node, depth) {
  const collapsed = state.book.view.collapsedIds.includes(node.id);
  const childCount = countDescendants(node);
  const hasHeading = Boolean(node.heading.trim());
  const showNumber = state.book.view.showHeadingNumbers !== false;
  const number = outlineNumberForNode(node.id);
  const headingCharacters = countCharacters(node.heading);

  return `
    <section class="manuscript-node ${hasHeading ? "has-heading" : ""}" data-node-id="${node.id}" data-depth="${Math.min(depth, 5)}">
      <div class="node-gutter" aria-label="段落操作">
        ${node.children.length ? `<button class="gutter-action" data-action="toggle-collapse" data-node-id="${node.id}" aria-label="${collapsed ? "展開" : "折り畳む"}" title="${collapsed ? "展開" : "折り畳む"}">${collapsed ? "▸" : "▾"}</button>` : '<span class="gutter-spacer"></span>'}
        <button class="gutter-action node-menu-button" data-action="paragraph-menu" data-node-id="${node.id}" aria-label="この項目の操作">操作</button>
      </div>
      <button class="paragraph-menu-trigger" data-action="paragraph-menu" data-node-id="${node.id}" aria-label="この項目の操作">操作</button>
      <div class="node-heading-row ${showNumber ? "" : "is-numberless"}">
        ${showNumber && number ? `<span class="node-heading-number" aria-hidden="true">${number}</span>` : ""}
        <input class="node-heading ${hasHeading ? "" : "is-empty"}" data-node-id="${node.id}" value="${escapeHtml(node.heading)}" placeholder="見出し（任意）" aria-label="見出し（任意）" />
        <span class="heading-character-count" data-heading-count-for="${node.id}">${headingCharacters.toLocaleString("ja-JP")}字</span>
      </div>
      <div class="node-body" data-node-id="${node.id}" contenteditable="plaintext-only" role="textbox" aria-multiline="true" spellcheck="true" lang="ja" data-placeholder="${node.body ? "" : "本文を書く"}"></div>
      ${collapsed && childCount ? `<button class="collapsed-summary" data-action="toggle-collapse" data-node-id="${node.id}">配下${childCount}件を表示</button>` : ""}
      <div class="node-children" ${collapsed ? "hidden" : ""}>${node.children.map((child) => renderWriteNode(child, depth + 1)).join("")}</div>
    </section>
  `;
}

function renderParagraphSheet() {
  const nodeId = state.paragraphMenuNodeId;
  const node = nodeId ? findNode(nodeId) : null;
  if (!node) return "";
  const collapsed = state.book.view.collapsedIds.includes(node.id);
  const context = findNodeContext(node.id);
  const loose = context?.container === "loose";
  const number = outlineNumberForNode(node.id);

  return `
    <button class="paragraph-sheet-backdrop" data-action="close-paragraph-menu" aria-label="項目操作を閉じる"></button>
    <aside class="paragraph-sheet" role="dialog" aria-modal="true" aria-label="項目の操作">
      <div class="paragraph-sheet__header">
        <div><span>項目の操作</span><strong>${number ? `${number} ` : ""}${escapeHtml(nodeLabel(node))}</strong></div>
        <button class="icon-button" data-action="close-paragraph-menu" aria-label="閉じる">×</button>
      </div>
      <div class="paragraph-sheet__actions">
        ${node.heading.trim() ? "" : `<button class="secondary-button" data-action="add-heading" data-node-id="${node.id}">見出しを付ける</button>`}
        ${node.children.length ? `<button class="secondary-button" data-action="toggle-collapse" data-node-id="${node.id}">${collapsed ? "配下を表示" : "配下を折り畳む"}</button>` : ""}
        <button class="secondary-button" data-action="copy-node" data-node-id="${node.id}">コピー</button>
        <button class="secondary-button" data-action="duplicate" data-node-id="${node.id}">複製</button>
        <button class="secondary-button" data-action="${loose ? "return-manuscript" : "move-loose"}" data-node-id="${node.id}">${loose ? "本文へ戻す" : "未配置へ移動"}</button>
        <button class="danger-button" data-action="delete-node" data-node-id="${node.id}">削除</button>
      </div>
    </aside>
  `;
}

function toggleHeadingNumbers() {
  if (!state.book) return;
  state.book.view.showHeadingNumbers = state.book.view.showHeadingNumbers === false;
  render();
  scheduleSave();
}

function updateMetadataCharacterCount(target) {
  if (!target || !state.book) return;
  if (target.classList.contains("book-title-input")) {
    const counter = document.querySelector(".title-character-count");
    if (counter) counter.textContent = `タイトル ${countCharacters(target.value).toLocaleString("ja-JP")}字`;
    return;
  }
  if (target.classList.contains("node-heading")) {
    const counter = document.querySelector(
      `[data-heading-count-for="${CSS.escape(target.dataset.nodeId)}"]`,
    );
    if (counter) counter.textContent = `${countCharacters(target.value).toLocaleString("ja-JP")}字`;
    return;
  }
  if (target.classList.contains("node-body")) {
    const counter = document.querySelector(".body-character-count");
    if (counter) counter.textContent = `本文 ${bookCharacters().toLocaleString("ja-JP")}字`;
  }
}

function handleRefinementAction(event) {
  const target = event.target.closest?.('[data-action="toggle-heading-numbers"]');
  if (!target) return;
  event.preventDefault();
  toggleHeadingNumbers();
}

function handleRefinementInput(event) {
  updateMetadataCharacterCount(event.target);
}

if (!app.dataset.refinementBound) {
  app.addEventListener("click", handleRefinementAction);
  app.addEventListener("input", handleRefinementInput);
  app.dataset.refinementBound = "true";
}
