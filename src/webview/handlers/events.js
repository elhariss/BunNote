/**
 * Queue auto-save after typing
 * 入力後に自動保存をキューに入れる
 */
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

/**
 * Initialize editor events and message handlers
 * エディターイベントとメッセージハンドラーを初期化
 */
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
    });

    cm.on("change", function (cmInstance, change) {
      lastTypingAt = Date.now();
      const lineCount = cmInstance.lineCount();
      const from = Math.max(0, change.from.line - 1);
      const to = Math.min(lineCount - 1, change.to.line + 1);
      for (let l = from; l <= to; l++) {
        updateListLineFlag(l);
      }
      updateListLineFlag(cmInstance.getCursor().line);

      if (hiddenUpdateTimer) clearTimeout(hiddenUpdateTimer);
      hiddenUpdateTimer = setTimeout(() => {
        try { cmInstance.refresh(); } catch (e) { }
        try { updateHiddenSyntax(false); } catch (e) { }
      }, 50);

      if (lastLineWithFormatting !== null) {
        lastLineWithFormatting = null;
      }

      if (currentFile && openTabs[currentFile]) {
        openTabs[currentFile].content = easyMDE.value();
      }

      queueAutoSave();
    });

    cm.on("cursorActivity", function () {
      try { cm.refresh(); } catch (e) { }
      if (hiddenUpdateTimer) clearTimeout(hiddenUpdateTimer);
      hiddenUpdateTimer = setTimeout(() => {
        try { updateHiddenSyntax(false); } catch (e) { }
      }, 25);
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

    /**
     * Get next number for ordered list at given indent level
     * 指定されたインデントレベルの順序付きリストの次の番号を取得
     */
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

    cm.setOption("extraKeys", {
      "Ctrl-S": function () { saveFile(false); },
      "Cmd-S": function () { saveFile(false); },
      "Enter": function (cmInstance) {
        const cursor = cmInstance.getCursor();
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
      }
    });

    setTimeout(() => updateHiddenSyntax(), 0);
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;

    if (msg.command === 'initialize') {
      const fileName = msg.fileName || 'Untitled.md';
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
      
      updateEditor();
      try { updateHiddenSyntax(false); } catch (e) { /* ignore if not ready */ }
      renderTabs();
      
      if (cm) {
        setTimeout(() => {
          try {
            cm.refresh();
            cm.focus();
          } catch (e) { /* ignore */ }
        }, 100);
      }
      return;
    } else if (msg.command === 'updateContent') {
      const isCustomEditorMode = document.body.dataset.editorMode === 'custom';
      
      if (isCustomEditorMode) {
        return;
      }
      
      if (currentFile && openTabs[currentFile]) {
        const currentContent = easyMDE.value();
        if (currentContent !== msg.content) {
          openTabs[currentFile].content = msg.content;
          lastSavedContent[currentFile] = msg.content;
          easyMDE.value(msg.content);
          try { updateHiddenSyntax(false); } catch (e) { /* ignore */ }
        }
      }
      return;
    }

    if (msg.command === 'vaultStatus') {
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
      updateEditor();
      try { updateHiddenSyntax(false); } catch (e) { /* ignore if not ready */ }
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
      updateEditor();
      renderTabs();
      renderFilesList();
      startTitleEditing();
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
