// @ts-nocheck

function updateEditor() {
  if (currentFile && openTabs[currentFile]) {
    const currentContent = easyMDE.value();
    const newContent = openTabs[currentFile].content;

    if (currentContent !== newContent) {
      const isFastLoad = typeof fastLoadPending !== 'undefined' && fastLoadPending;
      fastLoadPending = false;

      if (isFastLoad) {
        easyMDE.codemirror.operation(() => {
          easyMDE.value(newContent);
          easyMDE.codemirror.scrollTo(0, 0);
        });
      } else {
        const cursor = easyMDE.codemirror.getCursor();
        const scrollInfo = easyMDE.codemirror.getScrollInfo();

        try { clearHiddenMarks(); } catch (e) { }
        easyMDE.value(newContent);

        easyMDE.codemirror.setCursor(cursor);
        easyMDE.codemirror.scrollTo(scrollInfo.left, scrollInfo.top);
      }
    }
  } else {
    easyMDE.value('');
  }
  updateEditorTitle();
}

function updateEditorTitle() {
  if (editorTitleInput) {
    editorTitleInput.value = formatTitleFromFile(currentFile);
    resizeTitleInput();
  }
}

function resizeTitleInput() {
  if (!editorTitleInput) {
    return;
  }
  editorTitleInput.style.height = 'auto';
  editorTitleInput.style.height = `${editorTitleInput.scrollHeight}px`;
}

function startTitleEditing() {
  if (!currentFile || isTitleEditing || !editorTitleInput) {
    return;
  }
  isTitleEditing = true;
  editorTitleInput.focus();
  const len = editorTitleInput.value.length;
  try {
    editorTitleInput.setSelectionRange(len, len);
  } catch (e) { }
  resizeTitleInput();
}

function finishTitleEditing(save) {
  if (!isTitleEditing || !editorTitleInput) {
    return;
  }
  isTitleEditing = false;
  if (save && currentFile) {
    const candidate = buildNewRelativeName(editorTitleInput.value);
    if (candidate && candidate !== currentFile) {
      vscode.postMessage({
        command: 'renameFile',
        oldName: currentFile,
        newName: candidate,
        source: 'editorTitle',
        isCustomEditor: false
      });
      return;
    }
  }
  updateEditorTitle();
}

function handleRenameResult(msg) {
  if (msg.success) {
    if (msg.oldName && openTabs[msg.oldName]) {
      openTabs[msg.newName] = openTabs[msg.oldName];
      delete openTabs[msg.oldName];
    }
    if (lastSavedContent && msg.oldName && lastSavedContent[msg.oldName] !== undefined) {
      lastSavedContent[msg.newName] = lastSavedContent[msg.oldName];
      delete lastSavedContent[msg.oldName];
    }
    if (currentFile === msg.oldName) {
      currentFile = msg.newName;
      updateEditor();
      renderTabs();
    } else if (openTabs[msg.newName]) {
      renderTabs();
    }
  } else {
    vscode.postMessage({
      command: 'showError',
      message: msg.error || 'Failed to rename note'
    });

    if (msg.source === 'editorTitle') {
      startTitleEditing();
    }
  }
}

function handleFolderMoveResult(msg) {
  if (!msg || !msg.success) {
    vscode.postMessage({
      command: 'showError',
      message: (msg && msg.error) || 'Failed to move folder'
    });
    return;
  }

  const oldPath = msg.oldPath || '';
  const newPath = msg.newPath || '';
  if (!oldPath || !newPath) {
    return;
  }

  const nextTabs = {};
  Object.keys(openTabs).forEach((key) => {
    if (key === oldPath || key.startsWith(oldPath + '/')) {
      const nextKey = newPath + key.slice(oldPath.length);
      nextTabs[nextKey] = openTabs[key];
      if (nextTabs[nextKey]) {
        nextTabs[nextKey].name = nextKey;
      }
      if (lastSavedContent && lastSavedContent[key] !== undefined) {
        lastSavedContent[nextKey] = lastSavedContent[key];
        delete lastSavedContent[key];
      }
      if (currentFile === key) {
        currentFile = nextKey;
      }
    } else {
      nextTabs[key] = openTabs[key];
    }
  });
  openTabs = nextTabs;

  if (expandedFolders && expandedFolders.size) {
    const nextExpanded = new Set();
    expandedFolders.forEach((folder) => {
      if (folder === oldPath || folder.startsWith(oldPath + '/')) {
        nextExpanded.add(newPath + folder.slice(oldPath.length));
      } else {
        nextExpanded.add(folder);
      }
    });
    expandedFolders = nextExpanded;
  }

  updateEditor();
  renderTabs();
}

function renderTabs() {
  const tabsContainer = document.getElementById('editorTabs');
  const tabs = Object.keys(openTabs);

  tabsContainer.innerHTML = tabs.map(fileName => {
    const displayName = fileName.split(/[\\/]/).pop().replace(/\.md$/i, '');
    return "<div class=\"editor_tab " + (currentFile === fileName ? "active" : "") + "\" onclick=\"openFile('" + escapeHtml(fileName) + "')\">" +
      "<span class=\"tab_title\">" + escapeHtml(displayName) + "</span>" +
      "<span class=\"tab_close\" onclick=\"closeTab(event, '" + escapeHtml(fileName) + "')\" title=\"Close\">×</span>" +
      "</div>";
  }).join('');
}

function closeTab(e, fileName) {
  e.stopPropagation();
  delete openTabs[fileName];
  if (lastSavedContent && lastSavedContent[fileName] !== undefined) {
    delete lastSavedContent[fileName];
  }

  if (currentFile === fileName) {
    const remainingTabs = Object.keys(openTabs);
    if (remainingTabs.length > 0) {
      currentFile = remainingTabs[0];
    } else {
      currentFile = null;
    }
  }

  updateEditor();
  renderTabs();
}

function saveFile(isAutoSave = false) {
  if (!currentFile) {
    return;
  }

  const content = easyMDE.value();
  const isCustomEditorMode = document.body.dataset.editorMode === 'custom';

  lastLocalSaveAt = Date.now();
  lastLocalSaveFile = currentFile;

  if (isCustomEditorMode) {
    vscode.postMessage({
      command: 'saveContent',
      content: content
    });
  } else {
    vscode.postMessage({
      command: 'saveFile',
      fileName: currentFile,
      content: content,
      isAutoSave: isAutoSave
    });
  }

  if (openTabs[currentFile]) {
    openTabs[currentFile].content = content;
  }
  if (lastSavedContent) {
    lastSavedContent[currentFile] = content;
  }
}

window.updateEditor = updateEditor;
window.updateEditorTitle = updateEditorTitle;
window.resizeTitleInput = resizeTitleInput;
window.startTitleEditing = startTitleEditing;
window.finishTitleEditing = finishTitleEditing;
window.handleRenameResult = handleRenameResult;
window.handleFolderMoveResult = handleFolderMoveResult;
window.renderTabs = renderTabs;
window.closeTab = closeTab;
window.saveFile = saveFile;
