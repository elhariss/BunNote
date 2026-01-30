// @ts-nocheck


function updateEditor() {
  if (currentFile && openTabs[currentFile]) {
    // Clear any existing marks (they belong to the previous buffer state)
    try { clearHiddenMarks(); } catch (e) { /* ignore */ }
    easyMDE.value(openTabs[currentFile].content);
  } else {
    easyMDE.value('');
  }
  updateEditorTitle();
}

function updateEditorTitle() {
  if (editorTitleInput) {
    editorTitleInput.value = formatTitleFromFile(currentFile);
  }
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
  } catch (e) { /* ignore */ }
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
        source: 'editorTitle'
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
    renderFilesList();
  } else {
    window.alert(msg.error || 'Failed to rename note');
    if (msg.source === 'editorTitle') {
      startTitleEditing();
    }
  }
}

function handleFolderMoveResult(msg) {
  if (!msg || !msg.success) {
    window.alert((msg && msg.error) || 'Failed to move folder');
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
  renderFilesList();
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

  vscode.postMessage({
    command: 'saveFile',
    fileName: currentFile,
    content: content,
    isAutoSave: isAutoSave
  });

  if (openTabs[currentFile]) {
    openTabs[currentFile].content = content;
  }
  if (lastSavedContent) {
    lastSavedContent[currentFile] = content;
  }
}

// Expose functions to global scope
window.updateEditor = updateEditor;
window.updateEditorTitle = updateEditorTitle;
window.startTitleEditing = startTitleEditing;
window.finishTitleEditing = finishTitleEditing;
window.handleRenameResult = handleRenameResult;
window.handleFolderMoveResult = handleFolderMoveResult;
window.renderTabs = renderTabs;
window.closeTab = closeTab;
window.saveFile = saveFile;
