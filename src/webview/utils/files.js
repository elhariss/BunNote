// ============================================
// File Operations / ファイル操作
// ============================================

function createNewFolder() {
  vscode.postMessage({
    command: 'requestCreateFolder',
    parentFolder: ''
  });
}

function setVault() {
  vscode.postMessage({ command: 'openSettings' });
}

function createNewNote() {
  vscode.postMessage({
    command: 'createNote'
  });
}

function refreshFiles() {
  vscode.postMessage({ command: 'getVault' });
}

// Context menu state / コンテキストメニュー状態
let contextMenuFile = null;
let contextMenuFolder = null;
let contextMenuListParent = null;
let dragPayload = null;
let dragIndicator = null;
let activeDropTarget = null;

// ============================================
// Context Menu / コンテキストメニュー
// ============================================

function initContextMenu() {
  const menu = document.getElementById('fileContextMenu');
  const editTitleBtn = document.getElementById('editTitleAction');
  const deleteBtn = document.getElementById('deleteFileAction');
  const duplicateBtn = document.getElementById('duplicateFileAction');
  if (!menu || !deleteBtn) return;

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (contextMenuFile) {
      vscode.postMessage({ command: 'confirmDeleteFile', fileName: contextMenuFile });
    }
    hideAllContextMenus();
  });

  if (editTitleBtn) {
    editTitleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (contextMenuFile) {
        vscode.postMessage({
          command: 'requestRename',
          fileName: contextMenuFile,
          source: 'contextMenu'
        });
      }
      hideAllContextMenus();
    });
  }

  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (contextMenuFile) {
        vscode.postMessage({ command: 'duplicateFile', fileName: contextMenuFile });
      }
      hideAllContextMenus();
    });
  }
}

function initFolderContextMenu() {
  const menu = document.getElementById('folderContextMenu');
  const createBtn = document.getElementById('createSubfolderAction');
  const renameBtn = document.getElementById('renameFolderAction');
  const deleteBtn = document.getElementById('deleteFolderAction');
  if (!menu) return;

  if (createBtn) {
    createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (contextMenuFolder !== null) {
        vscode.postMessage({
          command: 'requestCreateFolder',
          parentFolder: contextMenuFolder
        });
      }
      hideAllContextMenus();
    });
  }

  if (renameBtn) {
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (contextMenuFolder) {
        vscode.postMessage({
          command: 'requestRenameFolder',
          folderPath: contextMenuFolder
        });
      }
      hideAllContextMenus();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (contextMenuFolder) {
        vscode.postMessage({
          command: 'deleteFolder',
          folderPath: contextMenuFolder
        });
      }
      hideAllContextMenus();
    });
  }
}

function initListContextMenu() {
  const menu = document.getElementById('listContextMenu');
  const createBtn = document.getElementById('createFolderAction');
  if (!menu || !createBtn) return;

  createBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    vscode.postMessage({
      command: 'requestCreateFolder',
      parentFolder: contextMenuListParent || ''
    });
    hideAllContextMenus();
  });
}

function hideAllContextMenus() {
  const fileMenu = document.getElementById('fileContextMenu');
  const folderMenu = document.getElementById('folderContextMenu');
  const listMenu = document.getElementById('listContextMenu');
  const editorMenu = document.getElementById('editorContextMenu');

  if (fileMenu) {
    fileMenu.classList.remove('visible');
    fileMenu.setAttribute('aria-hidden', 'true');
    contextMenuFile = null;
  }
  if (folderMenu) {
    folderMenu.classList.remove('visible');
    folderMenu.setAttribute('aria-hidden', 'true');
    contextMenuFolder = null;
  }
  if (listMenu) {
    listMenu.classList.remove('visible');
    listMenu.setAttribute('aria-hidden', 'true');
    contextMenuListParent = null;
  }
  if (editorMenu) {
    editorMenu.classList.remove('visible');
    editorMenu.setAttribute('aria-hidden', 'true');
  }
}

function showFileContextMenu(event, fileName) {
  event.preventDefault();
  const menu = document.getElementById('fileContextMenu');
  const folderMenu = document.getElementById('folderContextMenu');
  if (!menu) return;

  contextMenuFile = fileName;
  if (folderMenu) {
    folderMenu.classList.remove('visible');
    folderMenu.setAttribute('aria-hidden', 'true');
    contextMenuFolder = null;
  }
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

function showFolderContextMenu(event, folderPath) {
  event.preventDefault();
  const menu = document.getElementById('folderContextMenu');
  const fileMenu = document.getElementById('fileContextMenu');
  const listMenu = document.getElementById('listContextMenu');
  if (!menu) return;

  contextMenuFolder = folderPath;
  if (fileMenu) {
    fileMenu.classList.remove('visible');
    fileMenu.setAttribute('aria-hidden', 'true');
    contextMenuFile = null;
  }
  if (listMenu) {
    listMenu.classList.remove('visible');
    listMenu.setAttribute('aria-hidden', 'true');
    contextMenuListParent = null;
  }
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

function showListContextMenu(event, parentFolder) {
  event.preventDefault();
  const menu = document.getElementById('listContextMenu');
  const fileMenu = document.getElementById('fileContextMenu');
  const folderMenu = document.getElementById('folderContextMenu');
  if (!menu) return;

  contextMenuListParent = parentFolder || '';
  if (fileMenu) {
    fileMenu.classList.remove('visible');
    fileMenu.setAttribute('aria-hidden', 'true');
    contextMenuFile = null;
  }
  if (folderMenu) {
    folderMenu.classList.remove('visible');
    folderMenu.setAttribute('aria-hidden', 'true');
    contextMenuFolder = null;
  }

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

// ============================================
// Drag and Drop / ドラッグアンドドロップ
// ============================================

const lastPointer = { x: 0, y: 0 };

function handleDragStart(event, itemType, itemPath) {
  lastPointer.x = event.clientX;
  lastPointer.y = event.clientY;
  dragPayload = { type: itemType, path: itemPath };
  try {
    event.dataTransfer.setData('application/bunnote-item', JSON.stringify(dragPayload));
  } catch (e) {
    // ignore
  }
  event.dataTransfer.effectAllowed = 'move';
  showDragIndicator(`Move ${itemType === 'folder' ? 'folder' : 'note'}`, event.clientX, event.clientY);
}

function handleDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  updateDragIndicatorPosition(event.clientX, event.clientY);
}

function handleDragEnd() {
  clearDropTarget();
  hideDragIndicator();
  dragPayload = null;
}

function showDragIndicator(text, x, y) {
  if (!dragIndicator) {
    dragIndicator = document.createElement('div');
    dragIndicator.className = 'drag_indicator';
    document.body.appendChild(dragIndicator);
  }
  dragIndicator.textContent = text;
  dragIndicator.classList.add('visible');
  updateDragIndicatorPosition(x, y);
}

function updateDragIndicatorPosition(x, y) {
  if (!dragIndicator) return;
  dragIndicator.style.left = `${x + 12}px`;
  dragIndicator.style.top = `${y + 12}px`;
}

function hideDragIndicator() {
  if (!dragIndicator) return;
  dragIndicator.classList.remove('visible');
}

function setDropTarget(element, label) {
  if (activeDropTarget && activeDropTarget !== element) {
    activeDropTarget.classList.remove('drop_target');
  }
  activeDropTarget = element || null;
  if (activeDropTarget) {
    activeDropTarget.classList.add('drop_target');
  }
  if (label) {
    showDragIndicator(label, lastPointer.x, lastPointer.y);
  }
}

function clearDropTarget() {
  if (activeDropTarget) {
    activeDropTarget.classList.remove('drop_target');
  }
  activeDropTarget = null;
}

// Drop item on folder / フォルダにドロップ
function handleDropOnFolder(event, targetFolder) {
  event.preventDefault();
  clearDropTarget();
  hideDragIndicator();
  let payload = null;
  try {
    const raw = event.dataTransfer.getData('application-bunnote-item');
    payload = raw ? JSON.parse(raw) : null;
  } catch (e) {
    payload = dragPayload;
  }

  if (!payload || !payload.path) {
    return;
  }

  const sourcePath = payload.path;
  const target = targetFolder || '';

  if (payload.type === 'file') {
    vscode.postMessage({
      command: 'moveFile',
      fileName: sourcePath,
      targetFolder: target
    });
  } else if (payload.type === 'folder') {
    vscode.postMessage({
      command: 'moveFolder',
      folderPath: sourcePath,
      targetFolder: target
    });
  }
}

function handleFolderDragEnter(event, folderPath) {
  event.preventDefault();
  lastPointer.x = event.clientX;
  lastPointer.y = event.clientY;
  const el = event.currentTarget;
  if (el) {
    const name = formatTitleFromFile(folderPath).replace(/\.md$/i, '');
    setDropTarget(el, `Move into "${name}"`);
  }
}

function handleFolderDragLeave(event) {
  const related = event.relatedTarget;
  const current = event.currentTarget;
  if (current && related && current.contains(related)) {
    return;
  }
  clearDropTarget();
  showDragIndicator('Move to root', lastPointer.x, lastPointer.y);
}

function initDragAndDrop() {
  const list = document.getElementById('filesList');
  if (!list) return;

  list.addEventListener('dragover', handleDragOver);
  list.addEventListener('drop', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('.folder_item')) {
      return;
    }
    handleDropOnFolder(event, '');
  });

  list.addEventListener('dragover', (event) => {
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    const target = event.target;
    if (!target || !target.closest || !target.closest('.folder_item')) {
      clearDropTarget();
      showDragIndicator('Move to root', event.clientX, event.clientY);
    }
  });

  list.addEventListener('dragleave', (event) => {
    if (event.target === list) {
      clearDropTarget();
      hideDragIndicator();
    }
  });

  list.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (target && target.closest) {
      if (target.closest('.folder_item') || target.closest('.file_item')) {
        return;
      }
    }
    showListContextMenu(event, '');
  });
}

// ============================================
// File Tree / ファイルツリー
// ============================================

function renderFilesList() {
  const filesList = document.getElementById('filesList');
  if (!filesList) return;

  if (files.length === 0 && folders.length === 0) {
    filesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-file-text"></i></div><div class="empty-state-text">No markdown files found</div></div>';
    return;
  }

  const tree = buildFileTree(files, folders);
  filesList.innerHTML = renderTree(tree);
}

function buildFileTree(fileList, folderList) {
  const root = { name: '', path: '', folders: {}, files: [] };

  const ensureFolder = (parts) => {
    let node = root;
    let currentPath = '';
    parts.forEach(part => {
      currentPath = currentPath ? currentPath + '/' + part : part;
      if (!node.folders[part]) {
        node.folders[part] = { name: part, path: currentPath, folders: {}, files: [] };
      }
      node = node.folders[part];
    });
    return node;
  };

  (folderList || []).forEach(folderPath => {
    const parts = (folderPath || '').split(/[\\/]/).filter(Boolean);
    if (parts.length) ensureFolder(parts);
  });

  (fileList || []).forEach(file => {
    const parts = (file.path || '').split(/[\\/]/).filter(Boolean);
    if (!parts.length) return;
    const fileName = parts.pop();
    const folderNode = ensureFolder(parts);
    folderNode.files.push({
      name: file.name || fileName,
      path: file.path
    });
  });

  return root;
}

function renderTree(node, depth = 0) {
  const indent = depth * 14;
  let html = '';

  const folderNames = Object.keys(node.folders).sort((a, b) => a.localeCompare(b));
  const fileEntries = (node.files || []).sort((a, b) => a.name.localeCompare(b.name));

  folderNames.forEach(folderName => {
    const folderNode = node.folders[folderName];
    const folderPath = folderNode.path || folderName;
    const isExpanded = expandedFolders.has(folderPath);
    html += "<div class=\"folder_item " + (isExpanded ? "expanded" : "collapsed") + "\" style=\"padding-left:" + (12 + indent) + "px\" onclick=\"toggleFolder('" + escapeHtml(folderPath) + "')\" oncontextmenu=\"showFolderContextMenu(event, '" + escapeHtml(folderPath) + "')\" draggable=\"true\" ondragstart=\"handleDragStart(event, 'folder', '" + escapeHtml(folderPath) + "')\" ondragover=\"handleDragOver(event)\" ondragenter=\"handleFolderDragEnter(event, '" + escapeHtml(folderPath) + "')\" ondragleave=\"handleFolderDragLeave(event)\" ondrop=\"handleDropOnFolder(event, '" + escapeHtml(folderPath) + "')\" ondragend=\"handleDragEnd()\">" +
      "<span class=\"file_icon\"><i class=\"ph " + (isExpanded ? "ph-folder-open " : "ph-folder") + "\"></i></span>" +
      "<span class=\"file_name\" title=\"" + escapeHtml(folderPath) + "\">" + escapeHtml(folderName) + "</span>" +
      "</div>";
    if (isExpanded) {
      html += renderTree(folderNode, depth + 1);
    }
  });

  fileEntries.forEach(file => {
    const displayName = file.name.replace(/\.md$/i, '');
    html += "<div class=\"file_item " + (currentFile === file.path ? "active" : "") + "\" style=\"padding-left:" + (12 + indent) + "px\" onclick=\"openFile('" + escapeHtml(file.path) + "')\" oncontextmenu=\"showFileContextMenu(event, '" + escapeHtml(file.path) + "')\" draggable=\"true\" ondragstart=\"handleDragStart(event, 'file', '" + escapeHtml(file.path) + "')\" ondragend=\"handleDragEnd()\">" +
      "<span class=\"file_icon\"><i class=\"ph ph-file-text\"></i></span>" +
      "<span class=\"file_name\" title=\"" + escapeHtml(file.path) + "\">" + escapeHtml(displayName) + "</span>" +
      "</div>";
  });

  return html;
}

function toggleFolder(folderPath) {
  if (!folderPath) return;
  if (expandedFolders.has(folderPath)) {
    expandedFolders.delete(folderPath);
  } else {
    expandedFolders.add(folderPath);
  }
  renderFilesList();
}

function openFile(fileName) {
  if (!fileName) return;

  if (openTabs[fileName]) {
    currentFile = fileName;
    updateEditor();
    renderTabs();
    renderFilesList();
    return;
  }

  currentFile = fileName;
  updateEditorTitle();
  renderTabs();
  renderFilesList();

  vscode.postMessage({
    command: 'loadFile',
    fileName: fileName
  });
}

function initGlobalContextMenuListeners() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    
    if (target.closest('.context_menu')) {
      return;
    }
    
    hideAllContextMenus();
  });

  document.addEventListener('scroll', hideAllContextMenus, { capture: true, passive: true });
  
  const filesList = document.getElementById('filesList');
  if (filesList) {
    filesList.addEventListener('scroll', hideAllContextMenus, { passive: true });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllContextMenus();
    }
  });
}

// ============================================
// Initialization / 初期化
// ============================================
(function() {
  function initialize() {
    initContextMenu();
    initFolderContextMenu();
    initListContextMenu();
    initDragAndDrop();
    initGlobalContextMenuListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

// Message handler / メッセージハンドラー
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.command) {
    case 'vaultStatus':
      files = message.files || [];
      folders = message.folders || [];
      if (expandedFolders.size === 0) {
        folders.forEach(folder => expandedFolders.add(folder));
      }
      renderFilesList();
      break;
    case 'fileLoaded':
      openTabs[message.fileName] = {
        name: message.fileName,
        content: message.content
      };
      currentFile = message.fileName;
      updateEditor();
      renderTabs();
      renderFilesList();
      break;
    case 'newNote':
      openTabs[message.fileName] = {
        name: message.fileName,
        content: message.content || ''
      };
      currentFile = message.fileName;
      updateEditor();
      renderTabs();
      renderFilesList();
      break;
    case 'refresh':
      vscode.postMessage({ command: 'getVault' });
      break;
    case 'fileChanged':
      // Reload file if it's currently open
      if (message.fileName && openTabs[message.fileName]) {
        vscode.postMessage({ 
          command: 'loadFile', 
          fileName: message.fileName 
        });
      }
      break;
  }
});
