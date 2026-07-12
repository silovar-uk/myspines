function parseImport(text, mode) {
  if (mode === "json") {
    const parsed = JSON.parse(text);
    return normalizeBook(parsed.book ?? parsed);
  }
  if (mode === "single") return [createNode({ body: text })];
  if (mode === "markdown") return parseMarkdownNodes(text);
  const blocks = splitIntoParagraphBlocks(text);
  return (blocks.length ? blocks : [""]).map((body) => createNode({ body }));
}

function parseMarkdownNodes(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const roots = [];
  const stack = [{ level: 0, children: roots }];
  let paragraph = [];
  const flushParagraph = () => {
    const body = paragraph.join("\n").trim();
    if (body) stack.at(-1).children.push(createNode({ body }));
    paragraph = [];
  };
  lines.forEach((line) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      while (stack.length > 1 && stack.at(-1).level >= level) stack.pop();
      const node = createNode({ heading: heading[2].trim() });
      stack.at(-1).children.push(node);
      stack.push({ level, children: node.children });
      return;
    }
    if (!line.trim()) flushParagraph();
    else paragraph.push(line);
  });
  flushParagraph();
  return roots.length ? roots : [createNode({ body: text })];
}

function splitIntoParagraphBlocks(text) {
  return text.replace(/\r\n?/g, "\n").split(/\n\s*\n+/g).map((part) => part.trim()).filter(Boolean);
}

function showPasteSuggestion(nodeId, blocks) {
  const existing = document.querySelector(".paste-suggestion");
  existing?.remove();
  const element = document.createElement("div");
  element.className = "toast paste-suggestion";
  element.innerHTML = `${blocks.length}段落を検出しました　<button class="secondary-button" style="min-height:30px;padding:3px 8px">${blocks.length}ノードに分ける</button>`;
  element.querySelector("button").addEventListener("click", () => {
    splitPastedNode(nodeId, blocks);
    element.remove();
  });
  document.body.append(element);
  setTimeout(() => element.remove(), 10000);
}

function splitPastedNode(nodeId, blocks) {
  const context = findNodeContext(nodeId);
  if (!context || blocks.length < 2) return;
  const newNodes = blocks.slice(1).map((body) => createNode({ body }));
  mutateStructure("貼り付けを段落へ分割", () => {
    context.node.body = blocks[0];
    context.siblings.splice(context.index + 1, 0, ...newNodes);
    state.book.view.selectedNodeId = newNodes[0]?.id ?? nodeId;
  }, { nodeId: newNodes[0]?.id ?? nodeId, field: "body", offset: 0 });
}
