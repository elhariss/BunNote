/**
 * Initialize EasyMDE editor with custom configuration
 * カスタム設定でEasyMDEエディターを初期化
 */
function initEditor() {
  const editorElement = document.getElementById('editor');

  easyMDE = new EasyMDE({
    element: editorElement,
    spellChecker: false,
    toolbar: false,
    status: false,
    autofocus: true,
    lineWrapping: true,
    placeholder: "# Start writing...\n\nType markdown and see it render live!\n\n## Examples:\n**bold text**\n*italic text*\n- bullet point\n> blockquote",
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    shortcuts: {
      toggleBold: "Cmd-B",
      toggleItalic: "Cmd-I",
      drawLink: "Cmd-K",
      toggleHeadingSmaller: "Cmd-H",
      toggleUnorderedList: "Cmd-L",
      toggleOrderedList: "Cmd-Alt-L",
      cleanBlock: "Cmd-E",
      drawTable: "Cmd-Alt-T",
      toggleBlockquote: "Cmd-'",
      toggleCodeBlock: "Cmd-Alt-C",
      togglePreview: "Cmd-P",
      toggleSideBySide: null,
      toggleFullScreen: null
    }
  });

  editorTitleInput = document.getElementById('editorTitleInput');

  if (editorTitleInput) {
    editorTitleInput.addEventListener('click', () => startTitleEditing());
    editorTitleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        finishTitleEditing(true);
      } else if (event.key === 'Escape') {
        finishTitleEditing(false);
      }
    });
    editorTitleInput.addEventListener('blur', () => finishTitleEditing(true));
  }

  updateEditorTitle();

  easyMDE.codemirror.setOption("mode", {
    name: "gfm",
    highlightFormatting: true
  });

  cm = easyMDE.codemirror;
  cm.setOption("styleActiveLine", true);

  initEditorContextMenu();

  const header = document.querySelector('.editor-header');
  const scroller = cm.getScrollerElement ? cm.getScrollerElement() : null;
  if (header && scroller) {
    let isHidden = false;
    scroller.addEventListener('scroll', () => {
      const shouldHide = scroller.scrollTop > 0;
      if (shouldHide !== isHidden) {
        isHidden = shouldHide;
        header.classList.toggle('editor-header-hidden', shouldHide);
      }
    }, { passive: true });
  }

  cm.on("renderLine", (cmInstance, line, element) => {
    const lineText = line.text || cmInstance.getLine(line.lineNo()) || "";
    const isListLine = /^\s*([-+*](?!-)|\d+[.)])[ \t]+/.test(lineText);
    const isQuoteLine = /^\s*>/.test(lineText);
    const isHrLine = /^\s*(([-*_])\s*\2\s*\2(?:\s*\2)*)\s*$/.test(lineText);
    const isTaskChecked = /^\s*([-+*]|\d+[.)])\s+\[[xX]\]/.test(lineText);
    const isActiveLine = cmInstance.getCursor().line === line.lineNo();
    element.classList.toggle("cm-inline-list", isListLine && !isActiveLine);
    element.classList.toggle("cm-blockquote-line", isQuoteLine);
    element.classList.toggle("cm-hr-line", isHrLine && !isActiveLine);
    element.classList.toggle("cm-task-checked-line", isTaskChecked);
    element.classList.toggle("cm-inactive-line", !isActiveLine);

    const listIndentMatch = lineText.match(/^(\s*)([-+*]|\d+[.)])\s+/);
    if (listIndentMatch) {
      const rawIndent = listIndentMatch[1] || "";
      const indentLen = rawIndent.replace(/\t/g, "    ").length;
      const level = Math.max(0, Math.floor(indentLen / 4));
      if (level > 0) {
        element.classList.add("cm-list-indent");
        element.style.setProperty("--list-indent-level", String(level));
      } else {
        element.classList.remove("cm-list-indent");
        element.style.removeProperty("--list-indent-level");
      }
    } else {
      element.classList.remove("cm-list-indent");
      element.style.removeProperty("--list-indent-level");
    }
  });

  // Add copy buttons to code blocks
  cm.on("update", () => {
    scheduleCopyButtonsUpdate();
  });

  // Update button positions on scroll (reuse scroller from above)
  if (scroller) {
    scroller.addEventListener('scroll', () => {
      updateCopyButtonPositions();
    }, { passive: true });
  }

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      updateCopyButtonPositions();
    });
  });

  hiddenMarks = [];
  codeLineHandles = [];
  listLineFlags = new WeakMap();
  listMarkerMarks = new Map();
}

/**
 * Initialize editor context menu
 * エディターコンテキストメニューを初期化
 */
function initEditorContextMenu() {
  const menu = document.getElementById('editorContextMenu');
  if (!menu || !cm) return;

  const wrapper = cm.getWrapperElement ? cm.getWrapperElement() : null;
  if (!wrapper) return;

  const showMenu = (event) => {
    event.preventDefault();
    hideAllContextMenus();
    menu.classList.add('visible');
    menu.setAttribute('aria-hidden', 'false');

    editorContextSelections = cm.listSelections();
    const hasSelection = editorContextSelections.some(sel =>
      sel.anchor.line !== sel.head.line || sel.anchor.ch !== sel.head.ch
    );

    if (!hasSelection) {
      const pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, "window");
      if (pos) {
        cm.setCursor(pos);
      }
    }
    cm.focus();

    const { innerWidth, innerHeight } = window;
    const rect = menu.getBoundingClientRect();
    let left = event.clientX;
    let top = event.clientY;
    if (left + rect.width > innerWidth - 8) {
      left = innerWidth - rect.width - 8;
    }
    if (top + rect.height > innerHeight - 8) {
      top = innerHeight - rect.height - 8;
    }
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  };

  wrapper.addEventListener('contextmenu', showMenu);

  // Get the CodeMirror scroller element and add scroll listener
  const scroller = cm.getScrollerElement ? cm.getScrollerElement() : null;
  if (scroller) {
    scroller.addEventListener('scroll', hideAllContextMenus, { passive: true });
  }

  const bindAction = (id, handler) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreEditorContextSelection();
      handler();
      hideAllContextMenus();
    });
  };

  bindAction('editorBoldAction', () => wrapSelection('**', '**'));
  bindAction('editorItalicAction', () => wrapSelection('*', '*'));
  bindAction('editorStrikeAction', () => wrapSelection('~~', '~~'));
  bindAction('editorBulletListAction', () => toggleListPrefix('bullet'));
  bindAction('editorNumberListAction', () => toggleListPrefix('number'));
  bindAction('editorTaskListAction', () => toggleTaskList());
  bindAction('editorQuoteAction', () => toggleBlockquote());
  bindAction('editorCodeBlockAction', () => insertCodeBlock());
  bindAction('editorInlineCodeAction', () => wrapSelection('`', '`'));
}

function showContextMenu(menu, event) {
  menu.classList.add('visible');
  menu.setAttribute('aria-hidden', 'false');

  const { innerWidth, innerHeight } = window;
  const rect = menu.getBoundingClientRect();
  let left = event.clientX;
  let top = event.clientY;
  if (left + rect.width > innerWidth - 8) {
    left = innerWidth - rect.width - 8;
  }
  if (top + rect.height > innerHeight - 8) {
    top = innerHeight - rect.height - 8;
  }

  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

let editorContextSelections = null;

function restoreEditorContextSelection() {
  if (!cm || !editorContextSelections || !editorContextSelections.length) return;
  try {
    cm.setSelections(editorContextSelections);
  } catch (e) {
    // ignore
  }
}

function wrapSelection(prefix, suffix) {
  if (!cm) return;
  cm.focus();
  const selection = cm.getSelection();
  const from = cm.getCursor('from');
  const to = cm.getCursor('to');

  if (selection) {
    cm.replaceSelection(prefix + selection + suffix, 'around');
    cm.setSelection(
      { line: from.line, ch: from.ch + prefix.length },
      { line: to.line, ch: to.ch + prefix.length }
    );
  } else {
    const cursor = cm.getCursor();
    cm.replaceRange(prefix + suffix, cursor);
    cm.setCursor({ line: cursor.line, ch: cursor.ch + prefix.length });
  }
}

function toggleListPrefix(type) {
  if (!cm) return;
  const fromLine = cm.getCursor('from').line;
  const toLine = cm.getCursor('to').line;
  cm.operation(() => {
    for (let line = fromLine; line <= toLine; line++) {
      const text = cm.getLine(line) || '';
      if (type === 'bullet') {
        if (/^\s*[-+*]\s+/.test(text)) {
          cm.replaceRange(text.replace(/^(\s*)[-+*]\s+/, '$1'), { line, ch: 0 }, { line, ch: text.length });
        } else {
          cm.replaceRange(`- ${text}`, { line, ch: 0 }, { line, ch: text.length });
        }
      } else if (type === 'number') {
        if (/^\s*\d+[.)]\s+/.test(text)) {
          cm.replaceRange(text.replace(/^(\s*)\d+[.)]\s+/, '$1'), { line, ch: 0 }, { line, ch: text.length });
        } else {
          cm.replaceRange(`1. ${text}`, { line, ch: 0 }, { line, ch: text.length });
        }
      }
    }
  });
}

function toggleTaskList() {
  if (!cm) return;
  const fromLine = cm.getCursor('from').line;
  const toLine = cm.getCursor('to').line;
  cm.operation(() => {
    for (let line = fromLine; line <= toLine; line++) {
      const text = cm.getLine(line) || '';
      if (/^\s*[-+*]\s+\[[ xX]\]\s+/.test(text)) {
        const next = text.replace(/^(\s*)[-+*]\s+\[[ xX]\]\s+/, '$1- ');
        cm.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
      } else if (/^\s*[-+*]\s+/.test(text)) {
        const next = text.replace(/^(\s*)[-+*]\s+/, '$1- [ ] ');
        cm.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
      } else if (text.trim().length === 0) {
        cm.replaceRange('- [ ] ', { line, ch: 0 }, { line, ch: text.length });
      } else {
        cm.replaceRange(`- [ ] ${text}`, { line, ch: 0 }, { line, ch: text.length });
      }
    }
  });
}

function toggleBlockquote() {
  if (!cm) return;
  const fromLine = cm.getCursor('from').line;
  const toLine = cm.getCursor('to').line;
  cm.operation(() => {
    for (let line = fromLine; line <= toLine; line++) {
      const text = cm.getLine(line) || '';
      if (/^\s*>\s+/.test(text)) {
        cm.replaceRange(text.replace(/^(\s*)>\s+/, '$1'), { line, ch: 0 }, { line, ch: text.length });
      } else {
        cm.replaceRange(`> ${text}`, { line, ch: 0 }, { line, ch: text.length });
      }
    }
  });
}

function insertCodeBlock() {
  if (!cm) return;
  cm.focus();
  const selection = cm.getSelection();
  const from = cm.getCursor('from');
  const to = cm.getCursor('to');

  if (selection) {
    cm.replaceSelection(`\n\`\`\`\n${selection}\n\`\`\`\n`, 'around');
    cm.setSelection(
      { line: from.line + 1, ch: 0 },
      { line: to.line + 1, ch: selection.split('\n').slice(-1)[0].length }
    );
  } else {
    const cursor = cm.getCursor();
    cm.replaceRange('\n```\n\n```\n', cursor);
    cm.setCursor({ line: cursor.line + 2, ch: 0 });
  }
}

function clearHiddenMarks() {
  if (listMarkerMarks) {
    listMarkerMarks.forEach(marks => {
      marks.forEach(m => {
        try { m.clear(); } catch (e) { /* ignore */ }
      });
    });
    listMarkerMarks.clear();
  }
  while (hiddenMarks.length) {
    const m = hiddenMarks.pop();
    try { m.clear(); } catch (e) { /* ignore */ }
  }
  while (codeLineHandles.length) {
    const h = codeLineHandles.pop();
    try {
      cm.removeLineClass(h, "text", "cm-code-block-line");
      cm.removeLineClass(h, "text", "cm-code-fence-line");
    } catch (e) { /* ignore */ }
  }
}

function recordListMark(lineIndex, mark) {
  hiddenMarks.push(mark);
  if (!listMarkerMarks) return;
  let marks = listMarkerMarks.get(lineIndex);
  if (!marks) {
    marks = [];
    listMarkerMarks.set(lineIndex, marks);
  }
  marks.push(mark);
}

function clearListMarkersForLine(lineIndex) {
  if (!listMarkerMarks) return;
  const marks = listMarkerMarks.get(lineIndex);
  if (!marks) return;
  marks.forEach(m => {
    try { m.clear(); } catch (e) { /* ignore */ }
  });
  listMarkerMarks.delete(lineIndex);
}

function applyListMarkersForLine(lineIndex) {
  if (!cm) return;
  const text = cm.getLine(lineIndex) || "";
  clearListMarkersForLine(lineIndex);

  const unordered = text.match(/^(\s*)([-+*])(?!-)([ \t]+)/);
  const ordered = text.match(/^(\s*)(\d+)([.)])([ \t]+)/);
  if (!unordered && !ordered) return;

  const taskMatch = text.match(/^(\s*)([-+*]|\d+[.)])\s+\[([ xX])\]/);
  const isTask = Boolean(taskMatch);

  if (isTask) {
    const bracketStart = text.indexOf('[', taskMatch[1].length);
    const start = bracketStart >= 0 ? bracketStart : 0;
    const end = start + 3;
    const checkbox = document.createElement('span');
    checkbox.className = 'cm-task-checkbox' + (taskMatch[3].toLowerCase() === 'x' ? ' checked' : '');
    recordListMark(lineIndex, cm.markText(
      { line: lineIndex, ch: start },
      { line: lineIndex, ch: end },
      { replacedWith: checkbox }
    ));

    if (unordered) {
      const markerStart = taskMatch[1].length;
      const hiddenMarker = document.createElement('span');
      hiddenMarker.className = 'cm-hidden-syntax-inline';
      hiddenMarker.style.display = 'none';
      recordListMark(lineIndex, cm.markText(
        { line: lineIndex, ch: markerStart },
        { line: lineIndex, ch: markerStart + 2 },
        { replacedWith: hiddenMarker }
      ));
    }
    return;
  }

  if (unordered) {
    const start = unordered[1].length;
    const bullet = document.createElement('span');
    bullet.textContent = '•';
    bullet.className = 'cm-list-bullet';
    recordListMark(lineIndex, cm.markText(
      { line: lineIndex, ch: start },
      { line: lineIndex, ch: start + 1 },
      { replacedWith: bullet }
    ));
    return;
  }

  if (ordered) {
    const start = ordered[1].length;
    const markerText = ordered[2] + ordered[3];
    const marker = document.createElement('span');
    marker.textContent = markerText;
    marker.className = 'cm-list-bullet';
    recordListMark(lineIndex, cm.markText(
      { line: lineIndex, ch: start },
      { line: lineIndex, ch: start + markerText.length },
      { replacedWith: marker }
    ));
  }
}

function updateListLineFlag(lineIndex) {
  const handle = cm.getLineHandle(lineIndex);
  if (!handle) return;
  const text = cm.getLine(lineIndex) || "";
  const isList = /^\s*([-+*](?!-)|\d+[.)])[ \t]+/.test(text);
  if (isList) {
    listLineFlags.set(handle, true);
  } else {
    listLineFlags.delete(handle);
  }
}

/**
 * Hide inline bold/italic markers using tokens
 * トークンを使用してインラインの太字/斜体マーカーを非表示
 */
function hideInlineFormatting(text, lineIndex, ignoreRanges = [], className = 'cm-hidden-syntax') {
  const overlapsIgnore = (start, end) =>
    ignoreRanges.some(r => start < r.end && end > r.start);

  const markRuns = (startOffset, source) => {
    const formattingRegex = /[*_]+|~{2,}/g;
    let match;
    let found = false;
    while ((match = formattingRegex.exec(source))) {
      const start = startOffset + match.index;
      const end = start + match[0].length;
      if (overlapsIgnore(start, end)) continue;
      found = true;
      hiddenMarks.push(cm.markText(
        { line: lineIndex, ch: start },
        { line: lineIndex, ch: end },
        { className }
      ));
    }
    return found;
  };

  const tokens = cm.getLineTokens(lineIndex) || [];
  let foundFormatting = false;
  for (const token of tokens) {
    if (!token.string) continue;
    if (token.type && /(formatting|strong|em|strikethrough|strike)/.test(token.type)) {
      const matched = markRuns(typeof token.start === 'number' ? token.start : 0, token.string);
      if (matched) {
        foundFormatting = true;
      }
    }
  }

  if (!foundFormatting && text) {
    markRuns(0, text);
  }
}

/**
 * Hide markdown link syntax on non-active lines: [text](url)
 * 非アクティブ行のマークダウンリンク構文を非表示: [text](url)
 */
function hideLinkSyntax(text, lineIndex, ignoreRanges = [], className = 'cm-hidden-syntax') {
  const overlapsIgnore = (start, end) =>
    ignoreRanges.some(r => start < r.end && end > r.start);

  const linkRegex = /\[[^\]]+\]\([^\)]+\)/g;
  let match;
  while ((match = linkRegex.exec(text))) {
    const full = match[0];
    const start = match.index;
    const end = start + full.length;
    const closeBracket = full.indexOf(']');
    const openParen = full.indexOf('(', closeBracket);
    const closeParen = full.lastIndexOf(')');

    if (closeBracket > 0) {
      if (!overlapsIgnore(start, start + 1)) {
        hiddenMarks.push(cm.markText(
          { line: lineIndex, ch: start },
          { line: lineIndex, ch: start + 1 },
          { className }
        ));
      }
      const closeStart = start + closeBracket;
      if (!overlapsIgnore(closeStart, closeStart + 1)) {
        hiddenMarks.push(cm.markText(
          { line: lineIndex, ch: closeStart },
          { line: lineIndex, ch: closeStart + 1 },
          { className }
        ));
      }
    }

    if (openParen >= 0 && closeParen > openParen) {
      const parenStart = start + openParen;
      const parenEnd = start + closeParen + 1;
      if (!overlapsIgnore(parenStart, parenEnd)) {
        hiddenMarks.push(cm.markText(
          { line: lineIndex, ch: parenStart },
          { line: lineIndex, ch: parenEnd },
          { className }
        ));
      }
    }

    if (linkRegex.lastIndex === start) {
      linkRegex.lastIndex = end;
    }
  }
}

const pendingImageRequests = new Map();
let imageRequestId = 0;

let codeBlockDirty = true;
let copyButtonsTimer = null;

let imageUpdateTimer = null;
let imageDirtyFrom = null;
let imageDirtyTo = null;
const imageLineCache = new Map();
const imageLineMarks = new Map();
let revealedImageLine = null;
let imageUpdateDelay = 250;

function isRemoteImageUrl(url) {
  return /^(https?:|data:|vscode-resource:|vscode-webview-resource:)/i.test(url);
}

function scheduleImageMarksUpdate(fromLine, toLine) {
  if (!cm) return;
  const maxLine = cm.lineCount() - 1;
  const start = Math.max(0, typeof fromLine === 'number' ? fromLine : 0);
  const end = Math.min(maxLine, typeof toLine === 'number' ? toLine : maxLine);

  if (imageDirtyFrom === null || start < imageDirtyFrom) {
    imageDirtyFrom = start;
  }
  if (imageDirtyTo === null || end > imageDirtyTo) {
    imageDirtyTo = end;
  }

  if (imageUpdateTimer) return;
  imageUpdateTimer = setTimeout(() => {
    imageUpdateTimer = null;
    const runFrom = imageDirtyFrom === null ? 0 : imageDirtyFrom;
    const runTo = imageDirtyTo === null ? maxLine : imageDirtyTo;
    imageDirtyFrom = null;
    imageDirtyTo = null;
    updateImageMarks(runFrom, runTo);
  }, imageUpdateDelay);
}

function revealImageMarkdown(lineIndex, start, end) {
  if (!cm || typeof lineIndex !== 'number') return;
  revealedImageLine = lineIndex;
  clearImageMarksForLine(lineIndex);
  try {
    if (typeof start === 'number' && typeof end === 'number' && end > start) {
      cm.setSelection({ line: lineIndex, ch: start }, { line: lineIndex, ch: end });
    } else {
      cm.setCursor({ line: lineIndex, ch: Math.max(0, start || 0) });
    }
  } catch (e) { /* ignore */ }
  try { updateHiddenSyntax(false); } catch (e) { /* ignore */ }
}

function clearRevealedImageLineIfNeeded() {
  if (!cm) return;
  if (revealedImageLine === null) return;
  const cursor = cm.getCursor();
  if (!cursor || cursor.line === revealedImageLine) return;
  const lineToRestore = revealedImageLine;
  revealedImageLine = null;
  scheduleImageMarksUpdate(lineToRestore, lineToRestore);
}

function clearImageMarksForLine(lineIndex) {
  const marks = imageLineMarks.get(lineIndex);
  if (marks && marks.length) {
    marks.forEach(m => {
      try { m.clear(); } catch (e) { /* ignore */ }
    });
  }
  imageLineMarks.delete(lineIndex);
  imageLineCache.delete(lineIndex);
}

function parseImageSyntax(text) {
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;
  const tokens = [];
  let match;
  while ((match = imageRegex.exec(text))) {
    const full = match[0];
    const alt = (match[1] || '').trim();
    const rawUrl = (match[2] || '').trim();
    const start = match.index;
    const end = start + full.length;
    const urlMatch = rawUrl.match(/^([^\s]+)(?:\s+"[^"]*")?\s*$/);
    const url = urlMatch ? urlMatch[1] : rawUrl;
    if (!url) continue;
    tokens.push({ start, end, alt, url });
    if (imageRegex.lastIndex === start) {
      imageRegex.lastIndex = end;
    }
  }
  return tokens;
}

function getImageRanges(text, ignoreRanges = []) {
  const overlapsIgnore = (start, end) =>
    ignoreRanges.some(r => start < r.end && end > r.start);

  const tokens = parseImageSyntax(text);
  return tokens
    .filter(token => !overlapsIgnore(token.start, token.end))
    .map(token => ({ start: token.start, end: token.end }));
}

function updateImageMarks(fromLine = 0, toLine = null) {
  if (!cm) return;
  const maxLine = cm.lineCount() - 1;
  const endLine = typeof toLine === 'number' ? Math.min(toLine, maxLine) : maxLine;
  const startLine = Math.max(0, fromLine);
  const cursor = cm.getCursor();
  const activeLine = cursor ? cursor.line : null;

  let inCodeBlock = false;
  let fenceChar = null;
  for (let i = 0; i <= endLine; i++) {
    const text = cm.getLine(i) || "";
    const fenceMatch = text.match(/^\s*([\x60~]{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      if (!inCodeBlock) {
        inCodeBlock = true;
        fenceChar = fence;
      } else if (fenceChar === fence) {
        inCodeBlock = false;
        fenceChar = null;
      }
    }

    if (i < startLine) {
      continue;
    }

    const cached = imageLineCache.get(i);
    if (cached === text && imageLineMarks.has(i)) {
      continue;
    }

    clearImageMarksForLine(i);

    if (revealedImageLine === i || activeLine === i) {
      imageLineCache.set(i, text);
      continue;
    }

    if (inCodeBlock) {
      imageLineCache.set(i, text);
      continue;
    }

    const tokens = parseImageSyntax(text);
    if (!tokens.length) {
      imageLineCache.set(i, text);
      continue;
    }

    const marks = [];
    tokens.forEach(token => {
      const wrapper = document.createElement('span');
      wrapper.className = 'cm-image-preview';
      wrapper.dataset.imageLine = String(i);
      wrapper.dataset.imageStart = String(token.start);
      wrapper.dataset.imageEnd = String(token.end);

      const img = document.createElement('img');
      img.className = 'cm-image-preview-img';
      img.alt = token.alt || 'Image';
      img.loading = 'lazy';

      img.src = token.url;
      if (!isRemoteImageUrl(token.url)) {
        img.dataset.pendingSrc = token.url;
        requestResolvedImage(token.url, img);
      }

      wrapper.appendChild(img);
      wrapper.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const line = Number(wrapper.dataset.imageLine);
        const start = Number(wrapper.dataset.imageStart);
        const end = Number(wrapper.dataset.imageEnd);
        revealImageMarkdown(line, start, end);
      });

      const mark = cm.markText(
        { line: i, ch: token.start },
        { line: i, ch: token.end },
        { replacedWith: wrapper }
      );
      marks.push(mark);
    });

    if (marks.length) {
      imageLineMarks.set(i, marks);
    }
    imageLineCache.set(i, text);
  }
}

function scheduleCopyButtonsUpdate() {
  if (!codeBlockDirty) return;
  if (copyButtonsTimer) return;
  copyButtonsTimer = setTimeout(() => {
    copyButtonsTimer = null;
    codeBlockDirty = false;
    addCopyButtonsToCodeBlocks();
  }, 300);
}

function markCodeBlockDirty() {
  codeBlockDirty = true;
  scheduleCopyButtonsUpdate();
}

function requestResolvedImage(url, img) {
  if (!img || typeof vscode === 'undefined' || !vscode || !vscode.postMessage) {
    return;
  }
  const requestId = ++imageRequestId;
  pendingImageRequests.set(requestId, img);
  vscode.postMessage({
    command: 'resolveImage',
    requestId,
    imagePath: url,
    fileName: currentFile,
    filePath: currentFilePath
  });
}

function handleResolvedImageResponse(requestId, uri) {
  if (!requestId) return;
  const img = pendingImageRequests.get(requestId);
  if (!img) return;
  pendingImageRequests.delete(requestId);
  if (uri) {
    img.src = uri;
    img.dataset.resolvedSrc = uri;
  }
}

/**
 * Render markdown images on non-active lines: ![alt](url)
 * 非アクティブ行のマークダウン画像をレンダリング: ![alt](url)
 */
function renderImageSyntax(text, lineIndex, ignoreRanges = []) {
  return getImageRanges(text, ignoreRanges);
}

/**
 * Hide inline code span markers on non-active lines: `code` or ``code``
 * 非アクティブ行のインラインコードスパンマーカーを非表示
 */
function hideInlineCodeSyntax(text, lineIndex, ignoreRanges = [], className = 'cm-hidden-syntax') {
  const overlapsIgnore = (start, end) =>
    ignoreRanges.some(r => start < r.end && end > r.start);

  const codeRegex = /(`+)([^`]+?)\1/g;
  let match;
  while ((match = codeRegex.exec(text))) {
    const tickLen = match[1].length;
    const start = match.index;
    const end = start + match[0].length;
    const startEnd = start + tickLen;
    const endStart = end - tickLen;

    if (!overlapsIgnore(startEnd, endStart)) {
      hiddenMarks.push(cm.markText(
        { line: lineIndex, ch: startEnd },
        { line: lineIndex, ch: endStart },
        { className: 'cm-inline-code' }
      ));
    }

    if (!overlapsIgnore(start, startEnd)) {
      hiddenMarks.push(cm.markText(
        { line: lineIndex, ch: start },
        { line: lineIndex, ch: startEnd },
        { className }
      ));
    }
    if (!overlapsIgnore(endStart, end)) {
      hiddenMarks.push(cm.markText(
        { line: lineIndex, ch: endStart },
        { line: lineIndex, ch: end },
        { className }
      ));
    }

    if (codeRegex.lastIndex === start) {
      codeRegex.lastIndex = end;
    }
  }
}

function getInlineCursorMarkerRanges(text, cursorCh) {
  const ranges = [];
  const addRange = (start, end) => {
    if (typeof start !== 'number' || typeof end !== 'number') return;
    if (end <= start) return;
    ranges.push({ start, end });
  };
  const isCursorNearRange = (start, end) => cursorCh >= start - 1 && cursorCh <= end;

  const emphasisRegex = /(\*{1,3}|_{1,3})([^*_]+?)\1/g;
  let match;
  while ((match = emphasisRegex.exec(text))) {
    const marker = match[1];
    const start = match.index;
    const end = start + match[0].length;
    const innerStart = start + marker.length;
    const innerEnd = end - marker.length;
    if ((cursorCh >= innerStart && cursorCh <= innerEnd) || isCursorNearRange(start, innerStart)) {
      addRange(start, start + marker.length);
      addRange(end - marker.length, end);
    } else if (isCursorNearRange(innerEnd, end)) {
      addRange(start, start + marker.length);
      addRange(end - marker.length, end);
    }
    if (match.index === emphasisRegex.lastIndex) {
      emphasisRegex.lastIndex++;
    }
  }

  const strikeRegex = /(~~)(.+?)\1/g;
  while ((match = strikeRegex.exec(text))) {
    const marker = match[1];
    const start = match.index;
    const end = start + match[0].length;
    const innerStart = start + marker.length;
    const innerEnd = end - marker.length;
    if ((cursorCh >= innerStart && cursorCh <= innerEnd) || isCursorNearRange(start, innerStart)) {
      addRange(start, start + marker.length);
      addRange(end - marker.length, end);
    } else if (isCursorNearRange(innerEnd, end)) {
      addRange(start, start + marker.length);
      addRange(end - marker.length, end);
    }
    if (match.index === strikeRegex.lastIndex) {
      strikeRegex.lastIndex++;
    }
  }

  const codeRegex = /(`+)([^`]+?)\1/g;
  while ((match = codeRegex.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    const tickLen = match[1].length;
    const innerStart = start + tickLen;
    const innerEnd = end - tickLen;
    if ((cursorCh >= innerStart && cursorCh <= innerEnd) || isCursorNearRange(start, innerStart)) {
      addRange(start, start + tickLen);
      addRange(end - tickLen, end);
    } else if (isCursorNearRange(innerEnd, end)) {
      addRange(start, start + tickLen);
      addRange(end - tickLen, end);
    }
    if (match.index === codeRegex.lastIndex) {
      codeRegex.lastIndex++;
    }
  }

  const linkRegex = /\[[^\]]+\]\([^\)]+\)/g;
  while ((match = linkRegex.exec(text))) {
    const full = match[0];
    const start = match.index;
    const closeBracket = full.indexOf(']');
    const openParen = full.indexOf('(', closeBracket);
    const closeParen = full.lastIndexOf(')');
    const openBracketStart = start;
    const openBracketEnd = start + 1;
    const closeBracketStart = start + closeBracket;
    const closeBracketEnd = closeBracketStart + 1;
    const openParenStart = start + openParen;
    const closeParenEnd = start + closeParen + 1;

    const textStart = start + 1;
    const textEnd = start + closeBracket;
    const urlStart = start + openParen + 1;
    const urlEnd = start + closeParen;

    if ((cursorCh >= textStart && cursorCh <= textEnd) ||
      (cursorCh >= urlStart && cursorCh <= urlEnd) ||
      isCursorNearRange(openBracketStart, openBracketEnd) ||
      isCursorNearRange(closeBracketStart, closeBracketEnd) ||
      isCursorNearRange(openParenStart, closeParenEnd)) {
      addRange(openBracketStart, openBracketEnd);
      addRange(closeBracketStart, closeBracketEnd);
      addRange(openParenStart, closeParenEnd);
    }

    if (match.index === linkRegex.lastIndex) {
      linkRegex.lastIndex++;
    }
  }

  return ranges;
}

/**
 * Update hidden syntax markers for markdown formatting
 * マークダウンフォーマットの非表示構文マーカーを更新
 */
function updateHiddenSyntax(includeActiveInline = false) {
  clearHiddenMarks();

  const cursor = cm.getCursor();
  const lines = cm.lineCount();

  let inCodeBlock = false;
  let fenceChar = null;
  let cursorInCodeBlock = false;

  for (let i = 0; i <= cursor.line && i < lines; i++) {
    const lineText = cm.getLine(i) || "";
    const fenceMatch = lineText.match(/^\s*([\x60~]{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      if (!inCodeBlock) {
        inCodeBlock = true;
        fenceChar = fence;
      } else if (fenceChar === fence) {
        inCodeBlock = false;
        fenceChar = null;
      }
    }
    if (i === cursor.line) {
      cursorInCodeBlock = inCodeBlock;
    }
  }

  inCodeBlock = false;
  fenceChar = null;

  for (let i = 0; i < lines; i++) {
    const text = cm.getLine(i) || "";
    const handle = cm.getLineHandle(i);
    let listIgnoreRanges = [];
    const isCursorNearRange = (start, end) => cursor.ch >= start - 1 && cursor.ch <= end;
    const now = Date.now();
    const isTyping = i === cursor.line && (now - lastTypingAt < typingGraceMs || now - lastCheckboxToggleAt < checkboxGraceMs);
    const suppressMarkers = i === cursor.line && now < suppressMarkersUntil;

    const fenceMatch = text.match(/^\s*([\x60~]{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      if (!inCodeBlock) {
        inCodeBlock = true;
        fenceChar = fence;
        if (handle) {
          cm.addLineClass(handle, "text", "cm-code-block-line");
          cm.addLineClass(handle, "text", "cm-code-fence-line");
          cm.addLineClass(handle, "text", "cm-code-block-start");
          codeLineHandles.push(handle);
        }
      } else if (fenceChar === fence) {
        inCodeBlock = false;
        fenceChar = null;
        if (handle) {
          cm.addLineClass(handle, "text", "cm-code-block-line");
          cm.addLineClass(handle, "text", "cm-code-fence-line");
          cm.addLineClass(handle, "text", "cm-code-block-end");
          codeLineHandles.push(handle);
        }
      } else if (handle) {
        cm.addLineClass(handle, "text", "cm-code-block-line");
        cm.addLineClass(handle, "text", "cm-code-fence-line");
        codeLineHandles.push(handle);
      }

      if (i !== cursor.line) {
        hiddenMarks.push(cm.markText(
          { line: i, ch: 0 },
          { line: i, ch: text.length },
          { className: 'cm-hidden-syntax' }
        ));
      }
      continue;
    }

    if (inCodeBlock) {
      if (handle) {
        cm.addLineClass(handle, "text", "cm-code-block-line");
        codeLineHandles.push(handle);
      }
      continue;
    }

    const unordered = text.match(/^(\s*)([-+*])(?!-)([ \t]+)/);
    const ordered = text.match(/^(\s*)(\d+)([.)])([ \t]+)/);

    if (unordered || ordered) {
      const isActive = i === cursor.line;
      const taskMatch = text.match(/^(\s*)([-+*]|\d+[.)])\s+\[([ xX])\]/);
      const isTask = Boolean(taskMatch);

      const applyListHiding = () => {
        if (isTask) {
          const bracketStart = text.indexOf('[', taskMatch[1].length);
          const start = bracketStart >= 0 ? bracketStart : 0;
          const end = start + 3;
          const checkbox = document.createElement('span');
          checkbox.className = 'cm-task-checkbox' + (taskMatch[3].toLowerCase() === 'x' ? ' checked' : '');
          hiddenMarks.push(cm.markText(
            { line: i, ch: start },
            { line: i, ch: end },
            { replacedWith: checkbox }
          ));

          if (unordered) {
            const markerStart = taskMatch[1].length;
            const hiddenMarker = document.createElement('span');
            hiddenMarker.className = 'cm-hidden-syntax-inline';
            hiddenMarker.style.display = 'none';
            hiddenMarks.push(cm.markText(
              { line: i, ch: markerStart },
              { line: i, ch: markerStart + 2 },
              { replacedWith: hiddenMarker }
            ));
            listIgnoreRanges = [{ start: markerStart, end: markerStart + 2 }, { start, end }];
          } else {
            listIgnoreRanges = [{ start, end }];
          }
        } else if (unordered) {
          const start = unordered[1].length;
          const bullet = document.createElement('span');
          bullet.textContent = '•';
          bullet.className = 'cm-list-bullet';
          hiddenMarks.push(cm.markText(
            { line: i, ch: start },
            { line: i, ch: start + 1 },
            { replacedWith: bullet }
          ));
          listIgnoreRanges = [{ start, end: start + 1 }];
        } else if (ordered) {
          const start = ordered[1].length;
          const number = ordered[2];
          const delimiter = ordered[3];
          const markerText = number + delimiter;
          const marker = document.createElement('span');
          marker.textContent = markerText;
          marker.className = 'cm-list-bullet';
          hiddenMarks.push(cm.markText(
            { line: i, ch: start },
            { line: i, ch: start + markerText.length },
            { replacedWith: marker }
          ));
          listIgnoreRanges = [{ start, end: start + markerText.length }];
        }
        hideInlineFormatting(text, i, listIgnoreRanges, 'cm-hidden-syntax-inline');
      };

      if (!isActive) {
        applyListHiding();
      } else {
        const recentCheckboxToggle = isTask && (now - lastCheckboxToggleAt < checkboxGraceMs);
        if (suppressMarkers || recentCheckboxToggle || (isTask && isTyping)) {
          applyListHiding();
        } else {
          let markerStart = unordered ? unordered[1].length : ordered[1].length;
          let markerEnd = markerStart + 1;
          if (ordered) {
            const markerText = ordered[2] + ordered[3];
            markerEnd = markerStart + markerText.length;
          }
          if (isTask) {
            const bracketStart = text.indexOf('[', taskMatch[1].length);
            const end = bracketStart >= 0 ? bracketStart + 3 : markerEnd;
            markerEnd = Math.max(markerEnd, end);
          }

          if (!isCursorNearRange(markerStart, markerEnd) && !isTyping) {
            applyListHiding();
          } else if (unordered) {
            listIgnoreRanges = [{ start: markerStart, end: markerStart + 1 }];
          }
        }
      }
    }

    const heading = text.match(/^(\s*)(#{1,6})(\s+)/);
    if (heading && heading[2]) {
      const start = heading[1].length;
      const end = start + heading[2].length + (heading[3] ? heading[3].length : 0);
      if (i !== cursor.line) {
        hiddenMarks.push(cm.markText({ line: i, ch: start }, { line: i, ch: end }, { className: 'cm-hidden-syntax' }));
        continue;
      }
      continue;
    }

    const hr = text.match(/^\s*(([-*_])\s*\2\s*\2(?:\s*\2)*)\s*$/);
    if (hr) {
      if (i !== cursor.line) {
        hiddenMarks.push(cm.markText(
          { line: i, ch: 0 },
          { line: i, ch: text.length },
          { className: 'cm-hidden-syntax' }
        ));
      }
      continue;
    }

    if (i === cursor.line) {
      if (isTyping || suppressMarkers) {
        continue;
      }
      const inlineVisibleRanges = getInlineCursorMarkerRanges(text, cursor.ch);
      const combinedIgnoreRanges = listIgnoreRanges.concat(inlineVisibleRanges);
      hideInlineFormatting(text, i, combinedIgnoreRanges, 'cm-hidden-syntax-inline');
      hideLinkSyntax(text, i, inlineVisibleRanges, 'cm-hidden-syntax-inline');
      hideInlineCodeSyntax(text, i, inlineVisibleRanges, 'cm-hidden-syntax-inline');
      continue;
    }

    const quote = text.match(/^(\s*)(>)(\s*)/);
    if (quote) {
      const start = quote[1].length;
      const end = start + 1 + (quote[3] ? quote[3].length : 0);
      if (i !== cursor.line) {
        hiddenMarks.push(cm.markText({ line: i, ch: start }, { line: i, ch: end }, { className: 'cm-hidden-syntax' }));
        const imageRanges = renderImageSyntax(text, i, []);
        hideInlineFormatting(text, i, imageRanges, 'cm-hidden-syntax-inline');
        hideLinkSyntax(text, i, imageRanges, 'cm-hidden-syntax-inline');
        hideInlineCodeSyntax(text, i, imageRanges, 'cm-hidden-syntax-inline');
        continue;
      }
      if (!isCursorNearRange(start, end)) {
        hiddenMarks.push(cm.markText({ line: i, ch: start }, { line: i, ch: end }, { className: 'cm-hidden-syntax-inline' }));
      }
    }

    const fileCmd = text.match(/^(\s*)(#file:)(\S*)/i);
    if (fileCmd) {
      const start = fileCmd[1].length;
      const end = start + fileCmd[2].length;
      if (i !== cursor.line) {
        hiddenMarks.push(cm.markText({ line: i, ch: start }, { line: i, ch: end }, { className: 'cm-hidden-syntax' }));
        continue;
      }
      if (!isCursorNearRange(start, end)) {
        hiddenMarks.push(cm.markText({ line: i, ch: start }, { line: i, ch: end }, { className: 'cm-hidden-syntax-inline' }));
        continue;
      }
    }

    const imageRanges = renderImageSyntax(text, i, listIgnoreRanges);
    const combinedIgnoreRanges = listIgnoreRanges.concat(imageRanges);
    hideInlineFormatting(text, i, combinedIgnoreRanges, 'cm-hidden-syntax-inline');
    hideLinkSyntax(text, i, combinedIgnoreRanges, 'cm-hidden-syntax-inline');
    hideInlineCodeSyntax(text, i, combinedIgnoreRanges, 'cm-hidden-syntax-inline');
  }

  if (includeActiveInline) {
    const activeText = cm.getLine(cursor.line) || "";
    hideInlineFormatting(activeText, cursor.line);
    hideInlineCodeSyntax(activeText, cursor.line);
  }
}

/**
 * Add copy buttons to code blocks
 * コードブロックにコピーボタンを追加
 */
function addCopyButtonsToCodeBlocks() {
  return;

  const wrapper = cm.getWrapperElement();
  if (!wrapper) return;
  if (!wrapper.style.position) {
    wrapper.style.position = 'relative';
  }

  // Remove existing copy buttons
  const existingButtons = wrapper.querySelectorAll('.cm-code-copy-btn');
  existingButtons.forEach(btn => btn.remove());

  const lines = cm.lineCount();
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let fenceChar = null;

  for (let i = 0; i < lines; i++) {
    const lineText = cm.getLine(i) || "";
    const fenceMatch = lineText.match(/^\s*([\x60~]{3,})/);

    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i;
        fenceChar = fence;
      } else if (fenceChar === fence) {
        // End of code block - add copy button
        addCopyButtonToBlock(codeBlockStart, i);
        inCodeBlock = false;
        codeBlockStart = -1;
        fenceChar = null;
      }
    }
  }
}

/**
 * Add copy button to a specific code block
 * 特定のコードブロックにコピーボタンを追加
 */
function addCopyButtonToBlock(startLine, endLine) {
  if (!cm) return;

  const wrapper = cm.getWrapperElement();
  if (!wrapper) return;

  // Create copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'cm-code-copy-btn';
  copyBtn.innerHTML = '<i class="ph ph-copy"></i>';
  copyBtn.title = 'Copy code';
  copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
  copyBtn.setAttribute('type', 'button');
  copyBtn.dataset.startLine = startLine;
  copyBtn.dataset.endLine = endLine;

  // Add click handler
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyCodeBlock(startLine, endLine, copyBtn);
  });

  const wrapperRect = wrapper.getBoundingClientRect();
  const sizer = wrapper.querySelector('.CodeMirror-sizer');
  const sizerRect = sizer ? sizer.getBoundingClientRect() : wrapperRect;
  const buttonWidth = 28;
  const contentPaddingRight = 20;
  const inset = 8;
  const targetLine = Math.min(endLine - 1, Math.max(startLine + 1, startLine));
  const lineRect = getCodeLineRect(targetLine);
  if (!lineRect) return;

  copyBtn.style.position = 'absolute';
  copyBtn.style.left = `${Math.max(8, sizerRect.right - wrapperRect.left - buttonWidth - contentPaddingRight - inset)}px`;
  copyBtn.style.top = `${lineRect.top - wrapperRect.top - 10}px`;
  copyBtn.style.zIndex = '10';

  // Append to wrapper
  wrapper.appendChild(copyBtn);
}

/**
 * Copy code block content to clipboard
 * コードブロックの内容をクリップボードにコピー
 */
function copyCodeBlock(startLine, endLine, button) {
  if (!cm) return;

  // Extract code content (excluding fence lines)
  const lines = [];
  for (let i = startLine + 1; i < endLine; i++) {
    lines.push(cm.getLine(i) || "");
  }
  const code = lines.join('\n');

  // Copy to clipboard
  navigator.clipboard.writeText(code).then(() => {
    // Show VSCode message
    vscode.postMessage({
      command: 'showMessage',
      type: 'info',
      message: 'Copied to your clipboard'
    });
  }).catch(err => {
    console.error('Failed to copy code:', err);
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      vscode.postMessage({
        command: 'showMessage',
        type: 'info',
        message: 'Copied to your clipboard'
      });
    } catch (e) {
      console.error('Fallback copy failed:', e);
      vscode.postMessage({
        command: 'showMessage',
        type: 'error',
        message: 'Failed to copy code'
      });
    }
    document.body.removeChild(textarea);
  });
}

/**
 * Update copy button positions on scroll
 * スクロール時にコピーボタンの位置を更新
 */
function updateCopyButtonPositions() {
  if (!cm) return;

  const wrapper = cm.getWrapperElement();
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const sizer = wrapper.querySelector('.CodeMirror-sizer');
  const sizerRect = sizer ? sizer.getBoundingClientRect() : wrapperRect;
  const buttonWidth = 28;
  const contentPaddingRight = 20;
  const inset = 8;
  const buttons = wrapper.querySelectorAll('.cm-code-copy-btn');

  buttons.forEach(btn => {
    const startLine = parseInt(btn.dataset.startLine);
    const endLine = parseInt(btn.dataset.endLine);
    if (isNaN(startLine) || isNaN(endLine)) return;

    const targetLine = Math.min(endLine - 1, Math.max(startLine + 1, startLine));
    const lineRect = getCodeLineRect(targetLine);
    if (!lineRect) return;

    btn.style.left = `${Math.max(8, sizerRect.right - wrapperRect.left - buttonWidth - contentPaddingRight - inset)}px`;
    btn.style.top = `${lineRect.top - wrapperRect.top - 10}px`;
  });
}

function getCodeLineRect(lineNumber) {
  if (!cm || typeof lineNumber !== 'number') return null;
  const display = cm.display;
  if (display && display.view && display.view.length) {
    for (const view of display.view) {
      if (view && view.line && typeof view.line.lineNo === 'function' && view.line.lineNo() === lineNumber) {
        if (view.node && view.node.getBoundingClientRect) {
          return view.node.getBoundingClientRect();
        }
      }
    }
  }
  return null;
}
