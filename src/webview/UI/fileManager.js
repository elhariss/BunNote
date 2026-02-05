// @ts-nocheck

let pendingEdit = null;

function updateEditor() {
  if (currentFile && fileContent !== undefined) {
    const currentContent = easyMDE.value();
    const newContent = fileContent;

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
  updateTitle();
}

function updateTitle() {
  if (editorTitleInput) {
    editorTitleInput.value = formatTitle(currentFile);
    resizeTitle();
  }
}

function resizeTitle() {
  if (!editorTitleInput) {
    return;
  }
  editorTitleInput.style.height = 'auto';
  editorTitleInput.style.height = `${editorTitleInput.scrollHeight}px`;
}

function startEdit() {
  if (!currentFile || isTitleEditing || !editorTitleInput) {
    return;
  }
  isTitleEditing = true;
  editorTitleInput.focus();
  const len = editorTitleInput.value.length;
  try {
    editorTitleInput.setSelectionRange(len, len);
  } catch (e) { }
  resizeTitle();
}

function finishEdit(save) {
  if (!isTitleEditing || !editorTitleInput) {
    return;
  }
  isTitleEditing = false;
  if (save && currentFile) {
    const candidate = buildRelPath(editorTitleInput.value);
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
  updateTitle();
}

function onRename(msg) {
  if (msg.success) {
    if (msg.oldName && lastSavedContent && lastSavedContent[msg.oldName] !== undefined) {
      lastSavedContent[msg.newName] = lastSavedContent[msg.oldName];
      delete lastSavedContent[msg.oldName];
    }
    if (currentFile === msg.oldName) {
      currentFile = msg.newName;
      updateEditor();
    }
  } else {
    vscode.postMessage({
      command: 'showError',
      message: msg.error || 'Failed to rename note'
    });

    if (msg.source === 'editorTitle') {
      startEdit();
    }
  }
}

function onFolderMove(msg) {
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

  if (currentFile === oldPath || currentFile.startsWith(oldPath + '/')) {
    currentFile = newPath + currentFile.slice(oldPath.length);
  }

  if (lastSavedContent) {
    const nextSavedContent = {};
    Object.keys(lastSavedContent).forEach((key) => {
      if (key === oldPath || key.startsWith(oldPath + '/')) {
        const nextKey = newPath + key.slice(oldPath.length);
        nextSavedContent[nextKey] = lastSavedContent[key];
      } else {
        nextSavedContent[key] = lastSavedContent[key];
      }
    });
    lastSavedContent = nextSavedContent;
  }

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
}

function openFile(fileName) {
  if (!fileName) {
    return;
  }
  if (currentFile === fileName) {
    return;
  }
  currentFile = fileName;
  vscode.postMessage({
    command: 'loadFile',
    fileName: fileName
  });
}

function saveFile(isAutoSave = false) {
  if (!currentFile) {
    return;
  }

  const content = easyMDE.value();
  const isMainEditorMode = document.body.dataset.editorMode === 'main';

  lastLocalSaveAt = Date.now();
  lastLocalSaveFile = currentFile;

  if (isMainEditorMode) {
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

  fileContent = content;
  if (lastSavedContent) {
    lastSavedContent[currentFile] = content;
  }
}

window.updateEditor = updateEditor;
window.updateTitle = updateTitle;
window.resizeTitle = resizeTitle;
window.startEdit = startEdit;
window.finishEdit = finishEdit;
window.onRename = onRename;
window.onFolderMove = onFolderMove;
window.openFile = openFile;
window.saveFile = saveFile;
