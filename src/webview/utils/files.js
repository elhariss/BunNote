
function createFolder() {
    vscode.postMessage({
        command: 'requestCreateFolder',
        parentFolder: ''
    });
}

function setVault() {
    vscode.postMessage({ command: 'openSettings' })
}


function createNewNote() {
    vscode.postMessage({
        command: 'createNote'
    });
}

let dragPayload = null;
let dragIndicator = null;
let activeDropTarget = null;

function handleDrageStart(event, itemType, itemPath) {
    // save drag item info
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;

    dragPayload = { type: itemType, path: itemPath };

    try {
        event.dataTransfer.setData(
            'application/bunnote-item',
            JSON.stringify(dragPayload)
        )
    } catch (e) {
        // ingroe browser limitations
        // ブラウザ制限は無視
    }

    event.dataTransfer.effectAllowed = 'move';

    showDragIndicator(
        `Move ${itemType === 'folder' ? 'folder' : 'note'}`,
        event.clientX,
        event.clientY
    );
}

const lastPointer = { x: 0, y: 0 };

function handleDropFolder(event, targetFolder) {
    event.preventDefault();
    clearDropTarget();
    hideDragIndicator();

    let payload = null;
    try {
        payload = JSON.parse(event.dataTransfer.getData('application/bunnote-item'));
    } catch {
        payload = dragPayload;
    }

    if (!payload || !payload.path) return;
    if (payload.type === 'file') {
        vscode.postMessage({
            command: 'moveFile',
            fileName: payload.path,
            targetFolder
        });
    } else {
        vscode.postMessage({
            command: 'moveFolder',
            folderName: payload.path,
            targetFolder
        });
    }
}








// --- Render the file/folder tree in the UI ---
function renderFilesList() {
    const filesListElem = document.getElementById('filesList');
    if (!filesListElem) return;

    if ((files.length === 0) && (folders.length === 0)) {
        filesListElem.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-file-text"></i></div><div class="empty-state-text">No markdown files found</div></div>';
        return;
    }

    const tree = buildFileTree(files, folders);
    filesListElem.innerHTML = renderTree(tree);
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
        html += "<div class=\"folder-item " + (isExpanded ? "expanded" : "collapsed") + "\" style=\"padding-left:" + (12 + indent) + "px\" onclick=\"toggleFolder('" + escapeHtml(folderPath) + "')\" oncontextmenu=\"showFolderContextMenu(event, '" + escapeHtml(folderPath) + "')\" draggable=\"true\" ondragstart=\"handleDragStart(event, 'folder', '" + escapeHtml(folderPath) + "')\" ondragover=\"handleDragOver(event)\" ondragenter=\"handleFolderDragEnter(event, '" + escapeHtml(folderPath) + "')\" ondragleave=\"handleFolderDragLeave(event)\" ondrop=\"handleDropOnFolder(event, '" + escapeHtml(folderPath) + "')\" ondragend=\"handleDragEnd()\">" +
            "<span class=\"file-icon\"><i class=\"ph " + (isExpanded ? "ph-folder-open " : "ph-folder") + "\"></i></span>" +
            "<span class=\"file-name\" title=\"" + escapeHtml(folderPath) + "\">" + escapeHtml(folderName) + "</span>" +
            "</div>";
        if (isExpanded) {
            html += renderTree(folderNode, depth + 1);
        }
    });

    fileEntries.forEach(file => {
        html += "<div class=\"file-item " + (currentFile === file.path ? "active" : "") + "\" style=\"padding-left:" + (12 + indent) + "px\" onclick=\"openFile('" + escapeHtml(file.path) + "')\" oncontextmenu=\"showFileContextMenu(event, '" + escapeHtml(file.path) + "')\" draggable=\"true\" ondragstart=\"handleDragStart(event, 'file', '" + escapeHtml(file.path) + "')\" ondragend=\"handleDragEnd()\">" +
            "<span class=\"file-icon\"><i class=\"ph ph-file-text\"></i></span>" +
            "<span class=\"file-name\" title=\"" + escapeHtml(file.path) + "\">" + escapeHtml(file.name) + "</span>" +
            "</div>";
    });
    return html;
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



// Only initialize drag-and-drop for now (context menu can be added later)
initDragAndDrop();

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'files':
            files = message.files;
            folders = message.folders;
            renderFilesList();
            break;
    }
});