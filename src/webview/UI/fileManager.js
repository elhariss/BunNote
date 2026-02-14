// @ts-nocheck

// Cache DOM queries for better performance
let cachedTitleInput = null;

function getTitleInput() {
  if (!cachedTitleInput) {
    cachedTitleInput = document.getElementById('editorTitleInput');
  }
  return cachedTitleInput;
}

function updateEditor() {
  const emptyState = document.getElementById('emptyState');
  const editorHeader = document.querySelector('.editor_header');
  const editorContainer = document.querySelector('.editor_container');
  const editorStats = document.getElementById('editorStats');
  
  const hasFile = currentFile && currentFile !== '' && fileContent !== undefined && fileContent !== null;
  
  if (hasFile) {
    if (emptyState) emptyState.classList.remove('visible');
    if (editorHeader) editorHeader.style.display = '';
    if (editorContainer) editorContainer.style.display = '';
    if (editorStats) editorStats.style.display = '';
    
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
    if (emptyState) emptyState.classList.add('visible');
    if (editorHeader) editorHeader.style.display = 'none';
    if (editorContainer) editorContainer.style.display = 'none';
    if (editorStats) editorStats.style.display = 'none';
    easyMDE.value('');
  }
  updateTitle();
}

function updateTitle() {
  const titleInput = getTitleInput();
  if (titleInput) {
    titleInput.value = formatTitle(currentFile);
    resizeTitle();
  }
}

function resizeTitle() {
  const titleInput = getTitleInput();
  if (!titleInput) {
    return;
  }
  titleInput.style.height = 'auto';
  titleInput.style.height = `${titleInput.scrollHeight}px`;
}

function startEdit() {
  const titleInput = getTitleInput();
  if (!currentFile || isTitleEditing || !titleInput) {
    return;
  }
  isTitleEditing = true;
  titleInput.focus();
  const len = titleInput.value.length;
  try {
    titleInput.setSelectionRange(len, len);
  } catch (e) { }
  resizeTitle();
}

function finishEdit(save) {
  const titleInput = getTitleInput();
  if (!isTitleEditing || !titleInput) {
    return;
  }
  isTitleEditing = false;
  if (save && currentFile) {
    const candidate = buildRelPath(titleInput.value);
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

  const oldPathPrefix = oldPath + '/';

  if (currentFile === oldPath || currentFile.startsWith(oldPathPrefix)) {
    currentFile = newPath + currentFile.slice(oldPath.length);
  }

  if (lastSavedContent) {
    const nextSavedContent = {};
    for (const key in lastSavedContent) {
      if (key === oldPath || key.startsWith(oldPathPrefix)) {
        const nextKey = newPath + key.slice(oldPath.length);
        nextSavedContent[nextKey] = lastSavedContent[key];
      } else {
        nextSavedContent[key] = lastSavedContent[key];
      }
    }
    lastSavedContent = nextSavedContent;
  }

  if (expandedFolders && expandedFolders.size) {
    const nextExpanded = new Set();
    expandedFolders.forEach((folder) => {
      if (folder === oldPath || folder.startsWith(oldPathPrefix)) {
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
