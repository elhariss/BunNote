function queueAutoSave() {
  if (!currentFile || !openTabs[currentFile]) {
    return;
  }

  const content = easyMDE.value();
  if (lastSavedContent && lastSavedContent[currentFile] === content) {
    return;
  }

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    if (!currentFile) return;
    const latest = easyMDE.value();
    if (lastSavedContent && lastSavedContent[currentFile] === latest) {
      return;
    }
    saveFile(true);
  }, autoSaveDelay);
}

function runHiddenSyntaxUpdate(minIdleMs = 700) {
  if (!cm) return;
  const now = Date.now();
  if (now - lastTypingAt < minIdleMs) {
    return;
  }

  const selections = cm.listSelections();
  const scrollInfo = cm.getScrollInfo();

  cm.operation(() => {
    try { updateHiddenSyntax(false); } catch (e) { }
    try { if (selections && selections.length) cm.setSelections(selections, null, { scroll: false }); } catch (e) { }
  });

  requestAnimationFrame(() => {
    try { cm.scrollTo(scrollInfo.left, scrollInfo.top); } catch (e) { }
  });
}

let listMarkerRefreshTimer = null;
let listMarkerFrom = null;
let listMarkerTo = null;
let quickSyntaxTimer = null;
let codeFenceLineState = null;

function queueListMarks(fromLine, toLine) {
  if (!cm || typeof refreshListMarks !== 'function') return;
  const maxLine = cm.lineCount() - 1;
  const start = Math.max(0, typeof fromLine === 'number' ? fromLine : 0);
  const end = Math.min(maxLine, typeof toLine === 'number' ? toLine : maxLine);

  if (listMarkerFrom === null || start < listMarkerFrom) {
    listMarkerFrom = start;
  }
  if (listMarkerTo === null || end > listMarkerTo) {
    listMarkerTo = end;
  }

  if (listMarkerRefreshTimer) return;
  listMarkerRefreshTimer = setTimeout(() => {
    listMarkerRefreshTimer = null;
    const runFrom = listMarkerFrom === null ? start : listMarkerFrom;
    const runTo = listMarkerTo === null ? end : listMarkerTo;
    listMarkerFrom = null;
    listMarkerTo = null;
    for (let l = runFrom; l <= runTo; l++) {
      refreshListMarks(l);
    }
  }, 60);
}

function queueQuickSyntaxUpdate() {
  if (quickSyntaxTimer) return;
  quickSyntaxTimer = setTimeout(() => {
    quickSyntaxTimer = null;
    try { runHiddenSyntaxUpdate(0); } catch (e) { }
  }, 40);
}

function isLineInFence(lineIndex) {
  if (!cm) return false;
  const total = cm.lineCount();
  if (!codeFenceLineState || codeFenceLineState.length !== total) {
    refreshFenceCache();
  }
  if (lineIndex < 0 || lineIndex >= codeFenceLineState.length) {
    return false;
  }
  return codeFenceLineState[lineIndex] === true;
}

function refreshFenceCache() {
  if (!cm) return;
  const total = cm.lineCount();
  const next = new Array(total).fill(false);
  let inCode = false;
  let fenceChar = null;
  for (let i = 0; i < total; i++) {
    const text = cm.getLine(i) || "";
    const fenceMatch = text.match(/^\s*([`~]{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      if (!inCode) {
        inCode = true;
        fenceChar = fence;
      } else if (fenceChar === fence) {
        inCode = false;
        fenceChar = null;
      }
      continue;
    }
    if (inCode) {
      next[i] = true;
    }
  }
  codeFenceLineState = next;
}

function getHiddenTimings() {
  const contentLength = easyMDE ? easyMDE.value().length : 0;
  const isHeavy = contentLength > 120000;
  const isVeryHeavy = contentLength > 250000;
  const isSidebarMode = document.body.dataset.editorMode === 'sidebar';

  let changeDelay = typeof hiddenUpdateDebounceMs === 'number' ? hiddenUpdateDebounceMs : 80;
  let cursorDelay = typeof hiddenCursorDebounceMs === 'number' ? hiddenCursorDebounceMs : 60;
  let minIdleMs = 700;

  if (isHeavy) {
    changeDelay = Math.max(changeDelay, 180);
    cursorDelay = Math.max(cursorDelay, 160);
    minIdleMs = 1200;
  }

  if (isVeryHeavy) {
    changeDelay = Math.max(changeDelay, 260);
    cursorDelay = Math.max(cursorDelay, 240);
    minIdleMs = 1600;
  }

  if (isSidebarMode) {
    changeDelay += 60;
    cursorDelay += 60;
    minIdleMs += 300;
  }

  return { changeDelay, cursorDelay, minIdleMs };
}

function queueRenderUpdate() {
  const run = () => {
    try { updateHiddenSyntax(false); } catch (e) { }
    lastHiddenUpdateAt = Date.now();
  };

  const runImages = () => {
    if (cm) {
      scheduleImageMarksUpdate(0, cm.lineCount() - 1);
    }
  };

  const contentLength = easyMDE ? easyMDE.value().length : 0;
  const isHeavy = contentLength > 120000;

  if (isCustomEditorMode) {
    const syntaxDelay = isHeavy ? 600 : 350;
    const imageDelay = isHeavy ? 1000 : 650;
    if (window.requestIdleCallback) {
      window.requestIdleCallback(run, { timeout: syntaxDelay });
      window.requestIdleCallback(runImages, { timeout: imageDelay });
    } else {
      setTimeout(run, syntaxDelay);
      setTimeout(runImages, imageDelay);
    }
    return;
  }

  if (window.requestIdleCallback) {
    window.requestIdleCallback(run, { timeout: 350 });
    window.requestIdleCallback(runImages, { timeout: 500 });
  } else {
    setTimeout(run, 150);
    setTimeout(runImages, 300);
  }
}

function initEvents() {
  if (cm) {
    cm.on("beforeChange", function (cmInstance, change) {
      if (change.origin === "+input" && change.text[0] === " ") {
        const cursor = cmInstance.getCursor();
        const lineNumber = cursor.line;
        const lineText = cmInstance.getLine(lineNumber) || "";
        const beforeCursor = lineText.slice(0, cursor.ch);

        lastLineWithFormatting = lineNumber;

        const listMatch = lineText.match(/^(\s*)([-+*])(?!-)$/);
        if (listMatch && cursor.ch === listMatch[1].length + 1) {
          const handle = cmInstance.getLineHandle(lineNumber);
          if (handle) {
            listLineFlags.delete(handle);
          }
        }

        const listMarkerMatch = beforeCursor.match(/^(\s*)([-+*]|\d+[.)])\s$/);
        const taskMarkerMatch = beforeCursor.match(/^(\s*)([-+*]|\d+[.)])\s+\[[ xX]\]\s$/);
        const listContentMatch = lineText.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
        const taskContentMatch = lineText.match(/^(\s*)([-+*]|\d+[.)])\s+\[[ xX]\]\s+(.+)$/);
        const hasContent = (listContentMatch && listContentMatch[3].trim().length > 0) ||
          (taskContentMatch && taskContentMatch[3].trim().length > 0);
        if (hasContent && (listMarkerMatch || taskMarkerMatch) && cursor.ch === lineText.length) {
          change.cancel();
          const indent = (listMarkerMatch ? listMarkerMatch[1] : taskMarkerMatch[1]) + "  ";
          const marker = listMarkerMatch ? listMarkerMatch[2] : taskMarkerMatch[2];
          const nestedPrefix = taskMarkerMatch
            ? `${indent}${marker} [ ] `
            : `${indent}${marker} `;
          cmInstance.replaceRange(`\n${nestedPrefix}`, { line: lineNumber, ch: lineText.length });
          cmInstance.setCursor({ line: lineNumber + 1, ch: nestedPrefix.length });
        }
      }

      if (change.origin === "+input" && change.text[0] === "*") {
        const cursor = cmInstance.getCursor();
        const line = cmInstance.getLine(cursor.line);
        const charBefore = cursor.ch > 0 ? line[cursor.ch - 1] : "";
        const charAfter = line[cursor.ch] || "";

        if (charBefore !== "*" && charAfter !== "*") {
          change.cancel();
          cmInstance.replaceRange("**", cursor);
          cmInstance.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
        }
      }

      if (change.origin === "+input" && change.text[0] === "`") {
        const cursor = cmInstance.getCursor();
        const line = cmInstance.getLine(cursor.line) || "";
        const charAfter = line[cursor.ch] || "";
        if (charAfter !== "`") {
          change.cancel();
          cmInstance.replaceRange("``", cursor);
          cmInstance.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
        }
      }

      if (change.origin === "+input" && change.text[0] === "[") {
        const cursor = cmInstance.getCursor();
        const line = cmInstance.getLine(cursor.line) || "";
        const charAfter = line[cursor.ch] || "";

        if (charAfter !== "]") {
          change.cancel();
          cmInstance.replaceRange("[]", cursor);
          cmInstance.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
        }
      }

      if (change.origin === "+input" && change.text[0] === "(") {
        const cursor = cmInstance.getCursor();
        const line = cmInstance.getLine(cursor.line) || "";
        const charAfter = line[cursor.ch] || "";

        if (charAfter !== ")") {
          change.cancel();
          cmInstance.replaceRange("()", cursor);
          cmInstance.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
        }
      }

      if (change.origin === "+input" && change.text[0] === '"') {
        const cursor = cmInstance.getCursor();
        const line = cmInstance.getLine(cursor.line) || "";
        const charAfter = line[cursor.ch] || "";

        if (charAfter !== '"') {
          change.cancel();
          cmInstance.replaceRange("\"\"", cursor);
          cmInstance.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
        }
      }
    });

    cm.on("change", function (cmInstance, change) {
      lastTypingAt = Date.now();
      if (typeof updateCopyButtons === 'function') {
        requestAnimationFrame(() => {
          try { updateCopyButtons(); } catch (e) { }
        });
      }
      const changedText = (change.text || []).join("\n");
      const removedText = (change.removed || []).join("\n");
      const hasLineShift = changedText.includes("\n") || removedText.includes("\n");
      if (hasLineShift) {
        markCodeBlockDirty();
        requestAnimationFrame(() => {
          try { addCodeCopyButtons(); } catch (e) { }
          try { updateCopyButtons(); } catch (e) { }
        });
      }
      const hasFenceChange = changedText.includes("```") || changedText.includes("~~~") || removedText.includes("```") || removedText.includes("~~~");
      if (hasFenceChange) {
        markCodeBlockDirty();
        refreshFenceCache();
        if (typeof queueFenceModeUpdate === 'function') {
          queueFenceModeUpdate();
        }
      }
      const cursorLine = cmInstance.getCursor().line;
      if (isLineInFence(cursorLine)) {
        const lineCount = cmInstance.lineCount();
        const fromLine = Math.max(0, Math.min(change.from.line, lineCount - 1));
        const toLine = Math.max(fromLine, Math.min(change.to.line + (change.text ? change.text.length : 1), lineCount - 1));
        for (let l = fromLine; l <= toLine; l++) {
          if (!isLineInFence(l)) continue;
          const handle = cmInstance.getLineHandle(l);
          if (!handle) continue;
          cmInstance.addLineClass(handle, "text", "cm-code-block-line");
          if (typeof codeLineHandles !== 'undefined' && codeLineHandles) {
            codeLineHandles.push(handle);
          }
        }
        if (currentFile && openTabs[currentFile]) {
          openTabs[currentFile].content = easyMDE.value();
        }
        queueAutoSave();
        return;
      }
      const lineText = cmInstance.getLine(cursorLine) || "";
      const isFence = /^\s*([`~]{3,})/.test(lineText);
      const isHr = /^\s*(([-*_])\s*\2\s*\2(?:\s*\2)*)\s*$/.test(lineText);
      if (isFence || isHr) {
        queueQuickSyntaxUpdate();
      }
      const lineCount = cmInstance.lineCount();
      const from = Math.max(0, change.from.line - 1);
      const to = Math.min(lineCount - 1, change.to.line + 1);
      scheduleImageMarksUpdate(from, to);
      for (let l = from; l <= to; l++) {
        updateListLineFlag(l);
      }
      updateListLineFlag(cmInstance.getCursor().line);
      queueListMarks(from, to);

      if (hiddenUpdateTimer) clearTimeout(hiddenUpdateTimer);
      const timings = getHiddenTimings();
      hiddenUpdateTimer = setTimeout(() => {
        try { runHiddenSyntaxUpdate(timings.minIdleMs); } catch (e) { }
      }, timings.changeDelay);

      if (lastLineWithFormatting !== null) {
        lastLineWithFormatting = null;
      }

      if (currentFile && openTabs[currentFile]) {
        openTabs[currentFile].content = easyMDE.value();
      }

      queueAutoSave();
    });

    cm.on("cursorActivity", function () {
      const cursor = cm.getCursor();
      if (cursor) {
        if (lastCursorLine !== null && lastCursorLine !== cursor.line) {
          const prevText = cm.getLine(lastCursorLine) || "";
          const wasHr = /^\s*(([-*_])\s*\2\s*\2(?:\s*\2)*)\s*$/.test(prevText);
          if (wasHr) {
            try { runHiddenSyntaxUpdate(0); } catch (e) { }
          }
        }
        if (lastCursorLine !== null && lastCursorLine !== cursor.line) {
          scheduleImageMarksUpdate(lastCursorLine, lastCursorLine);
        }
        scheduleImageMarksUpdate(cursor.line, cursor.line);
        lastCursorLine = cursor.line;
      }
      clearRevealedImageLine();
      if (cursor && isLineInFence(cursor.line)) {
        return;
      }
      if (hiddenUpdateTimer) clearTimeout(hiddenUpdateTimer);
      const timings = getHiddenTimings();
      hiddenUpdateTimer = setTimeout(() => {
        try { runHiddenSyntaxUpdate(timings.minIdleMs); } catch (e) { }
      }, timings.cursorDelay);
    });

    cm.on("focus", function () {
      editorFocused = true;
    });

    cm.on("blur", function () {
      editorFocused = false;
      runHiddenSyntaxUpdate(0);
    });

    cm.on("mousedown", function (cmInstance, event) {
      const target = event.target;
      if (!target || !target.classList || !target.classList.contains('cm-task-checkbox')) {
        return;
      }

      lastTypingAt = Date.now();
      lastCheckboxToggleAt = lastTypingAt;
      suppressMarkersUntil = Date.now() + 800;

      const pos = cmInstance.coordsChar({ left: event.clientX, top: event.clientY }, "window");
      const line = pos.line;
      const text = cmInstance.getLine(line) || "";
      const taskMatch = text.match(/^(\s*)([-+*]|\d+[.)])\s+\[([ xX])\]/);
      if (!taskMatch) {
        return;
      }

      const checked = taskMatch[3].toLowerCase() === "x";
      const replacement = taskMatch[0].replace(/\[([ xX])\]/, checked ? "[ ]" : "[x]");
      const fromCh = text.indexOf(taskMatch[0]);
      if (fromCh >= 0) {
        const toCh = fromCh + taskMatch[0].length;
        cmInstance.replaceRange(replacement, { line, ch: fromCh }, { line, ch: toCh });
        event.preventDefault();
        lastCheckboxToggleAt = Date.now();
        suppressMarkersUntil = Date.now() + 800;
        setTimeout(() => {
          try { updateHiddenSyntax(false); } catch (e) { }
        }, 0);
      }
    });

    cm.on("keydown", function (cmInstance, event) {
      if (event.key !== "Tab") return;

      const cursor = cmInstance.getCursor();
      const line = cursor.line;
      const text = cmInstance.getLine(line) || "";
      const listMatch = text.match(/^(\s*)([-+*]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);

      if (!listMatch) {
        return;
      }

      event.preventDefault();
      const indentUnit = "    ";

      if (event.shiftKey) {
        if (text.startsWith(indentUnit)) {
          const next = text.slice(indentUnit.length);
          cmInstance.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
          const ch = Math.max(0, cursor.ch - indentUnit.length);
          cmInstance.setCursor({ line, ch });
        }
      } else {
        let next = indentUnit + text;
        if (/^\d+[.)]$/.test(listMatch[2])) {
          next = next.replace(/^(\s*)\d+[.)]\s+/, "$11. ");
        }
        cmInstance.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
        cmInstance.setCursor({ line, ch: cursor.ch + indentUnit.length });
      }
    });

    const getNextNumberAtIndent = (cmInstance, startLine, targetIndentLen) => {
      for (let i = startLine; i >= 0; i--) {
        const text = cmInstance.getLine(i) || "";
        const match = text.match(/^(\s*)(\d+)([.)])\s+/);
        if (!match) continue;
        const indentLen = (match[1] || "").replace(/\t/g, "    ").length;
        if (indentLen === targetIndentLen) {
          const num = parseInt(match[2], 10);
          if (Number.isFinite(num)) return num + 1;
        }
        if (indentLen < targetIndentLen) {
          return 1;
        }
      }
      return 1;
    };

    const existingExtraKeys = cm.getOption("extraKeys");
    const mergedExtraKeys = (existingExtraKeys && typeof existingExtraKeys === "object")
      ? { ...existingExtraKeys }
      : {};

    mergedExtraKeys["Ctrl-S"] = function () { saveFile(false); };
    mergedExtraKeys["Cmd-S"] = function () { saveFile(false); };
    mergedExtraKeys["Enter"] = function (cmInstance) {
      const cursor = cmInstance.getCursor();
      if (isLineInFence(cursor.line)) {
        return cmInstance.execCommand("newlineAndIndent");
      }
      const lineText = cmInstance.getLine(cursor.line) || "";
      const numberedMatch = lineText.match(/^(\s*)(\d+[.)])\s*(.*)$/);
      if (numberedMatch) {
        const indent = numberedMatch[1] || "";
        const rest = (numberedMatch[3] || "").trim();
        const markerRaw = numberedMatch[2] || "1.";
        const markerSuffix = markerRaw.includes(")") ? ")" : ".";
        const indentLen = indent.replace(/\t/g, "    ").length;
        if (rest.length === 0 && indent.length >= 4) {
          const nextIndent = indent.slice(0, Math.max(0, indent.length - 4));
          const nextIndentLen = Math.max(0, indentLen - 4);
          const nextNumber = getNextNumberAtIndent(cmInstance, cursor.line - 1, nextIndentLen);
          const replacement = `${nextIndent}${nextNumber}${markerSuffix} `;
          cmInstance.replaceRange(replacement, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: lineText.length });
          cmInstance.setCursor({ line: cursor.line, ch: replacement.length });
          return;
        }
        if (rest.length > 0) {
          const nextNumber = getNextNumberAtIndent(cmInstance, cursor.line, indentLen);
          cmInstance.replaceSelection(`\n${indent}${nextNumber}${markerSuffix} `);
          return;
        }
      }
      const taskMatch = lineText.match(/^(\s*)([-+*]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1];
        const marker = taskMatch[2];
        const rest = taskMatch[4] || "";
        if (rest.trim().length === 0) {
          return cmInstance.execCommand("newlineAndIndent");
        }
        cmInstance.replaceSelection("\n" + indent + marker + " [ ] ");
        return;
      }
      try {
        return cmInstance.execCommand("newlineAndIndentContinueMarkdownList");
      } catch (e) {
        return cmInstance.execCommand("newlineAndIndent");
      }
    };

    cm.setOption("extraKeys", mergedExtraKeys);

    refreshFenceCache();

    queueRenderUpdate();
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;

    if (msg.command === 'resolvedImage') {
      handleImageResolved(msg.requestId, msg.uri);
      return;
    }

    if (msg.command === 'initialize') {
      const fileName = msg.fileName || 'Untitled.md';
      currentFilePath = msg.filePath || null;
      fastLoadPending = true;
      openTabs[fileName] = {
        name: fileName,
        content: msg.content || ''
      };
      if (lastSavedContent) {
        lastSavedContent[fileName] = msg.content || '';
      }
      currentFile = fileName;

      if (easyMDE) {
        easyMDE.value(msg.content || '');
      }

      refreshFenceCache();
      if (typeof queueFenceModeUpdate === 'function') {
        queueFenceModeUpdate();
      }

      updateEditor();
      queueRenderUpdate();
      renderTabs();

      if (cm) {
        setTimeout(() => {
          try {
            cm.refresh();
            cm.focus();
          } catch (e) { }
        }, 100);
      }
      return;
    } else if (msg.command === 'updateContent') {
      const isCustomEditorMode = document.body.dataset.editorMode === 'custom';

      if (isCustomEditorMode) {
        return;
      }

      const timeSinceLastTyping = Date.now() - (lastTypingAt || 0);
      if (timeSinceLastTyping < 2000) {
        return;
      }

      if (currentFile && openTabs[currentFile]) {
        const currentContent = easyMDE.value();
        if (currentContent !== msg.content) {
          openTabs[currentFile].content = msg.content;
          lastSavedContent[currentFile] = msg.content;
          easyMDE.value(msg.content);
          queueRenderUpdate();
        }
      }
      return;
    }

    if (msg.command === 'vaultStatus') {
      vaultPath = msg.vaultPath || null;
      files = msg.files || [];
      folders = msg.folders || [];
      if (expandedFolders.size === 0) {
        folders.forEach(folder => expandedFolders.add(folder));
      } else {
        const next = new Set();
        folders.forEach(folder => {
          if (expandedFolders.has(folder)) next.add(folder);
        });
        expandedFolders = next;
      }
      renderFilesList();
    } else if (msg.command === 'fileLoaded') {
      openTabs[msg.fileName] = {
        name: msg.fileName,
        content: msg.content
      };
      if (lastSavedContent) {
        lastSavedContent[msg.fileName] = msg.content || '';
      }
      currentFile = msg.fileName;
      currentFilePath = msg.filePath || null;
      fastLoadPending = true;
      refreshFenceCache();
      if (typeof queueFenceModeUpdate === 'function') {
        queueFenceModeUpdate();
      }
      updateEditor();
      queueRenderUpdate();
      renderTabs();
      if (pendingTitleEditFile && pendingTitleEditFile === msg.fileName) {
        pendingTitleEditFile = null;
        startTitleEditing();
      }
    } else if (msg.command === 'newNote') {
      openTabs[msg.fileName] = {
        name: msg.fileName,
        content: msg.content || ''
      };
      if (lastSavedContent) {
        lastSavedContent[msg.fileName] = msg.content || '';
      }
      currentFile = msg.fileName;
      currentFilePath = msg.filePath || null;
      fastLoadPending = true;
      updateEditor();
      renderTabs();
      renderFilesList();
      startTitleEditing();
      queueRenderUpdate();
    } else if (msg.command === 'openFile') {
      vscode.postMessage({
        command: 'loadFile',
        fileName: msg.fileName
      });
    } else if (msg.command === 'renameResult') {
      handleRenameResult(msg);
    } else if (msg.command === 'folderMoveResult') {
      handleFolderMoveResult(msg);
    } else if (msg.command === 'refresh') {
      vscode.postMessage({ command: 'getVault' });
    }
  });
}
