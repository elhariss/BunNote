// @ts-nocheck

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

/**
 * Handle file rename with state updates
 * Manages saved content cache and current file tracking
 * 状態更新を伴うファイル名変更を処理
 * 保存されたコンテンツキャッシュと現在のファイル追跡を管理
 */
function onRename(msg) {
  if (msg.success) {
    // Update saved content cache with new file name / 新しいファイル名で保存されたコンテンツキャッシュを更新
    if (msg.oldName && lastSavedContent && lastSavedContent[msg.oldName] !== undefined) {
      lastSavedContent[msg.newName] = lastSavedContent[msg.oldName];
      delete lastSavedContent[msg.oldName];
    }
    // Update current file if it was renamed / 名前が変更された場合は現在のファイルを更新
    if (currentFile === msg.oldName) {
      currentFile = msg.newName;
      updateEditor();
    }
  } else {
    vscode.postMessage({
      command: 'showError',
      message: msg.error || 'Failed to rename note'
    });

    // Re-enable editing if rename failed from editor title / エディタタイトルからの名前変更が失敗した場合は編集を再度有効化
    if (msg.source === 'editorTitle') {
      startEdit();
    }
  }
}

/**
 * Handle folder move operations with path updates
 * Updates all affected file paths and expanded folder states
 * パス更新を伴うフォルダ移動操作を処理
 * 影響を受けるすべてのファイルパスと展開されたフォルダの状態を更新
 */
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

  // Update current file path if it's inside the moved folder / 移動されたフォルダ内にある場合は現在のファイルパスを更新
  if (currentFile === oldPath || currentFile.startsWith(oldPath + '/')) {
    currentFile = newPath + currentFile.slice(oldPath.length);
  }

  // Update saved content cache with new paths / 新しいパスで保存されたコンテンツキャッシュを更新
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

  // Update expanded folders state / 展開されたフォルダの状態を更新
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
