
function createFolder(){
    vscode.postMessage({
        command: 'requestCreateFolder',
        parentFolder: ''
    });
}

function setVault(){
    vscode.postMessage({ command: 'openSettings' })
}


function createNewNote(){
    vscode.postMessage({
        command: 'createNote'
    });
}

let dragPayload = null;
let dragIndicator = null;
let activeDropTarget = null;

function handleDrageStart(event, itemType, itemPath){
    // save drag item info
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;

    dragPayload = { type: itemType, path: itemPath};

    try{
        event.dataTransfer.setData(
            'application/bunnote-item',
            JSON.stringify(dragPayload)
        )
    }catch(e){
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

function handleDropFolder(event, targetFolder){
    event.preventDefault();
    clearDropTarget();
    hideDragIndicator();

    let payload = null;
    try{
        payload = JSON.parse(event.dataTransfer.getData('application/bunnote-item'));
    }catch{
        payload = dragPayload;
    }

    if(!payload || !payload.path) return; 
    if(payload.type === 'file'){
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






function renderFilesList(){
   const filesList = document.getElementById('filesList');

   if(filesList.length === 0 && folders.length === 0){
    filesList.innerHTML = '<div class="empty-state">No markdown files found</div>';
    return;
   }

   const tree = buildFileTree(filesList, folderList);
   filesList.innerHTML = renderTree(tree);
}


function toggleFolder(folderPath){
    if(!folderPath) return;
    if(expandedFolders.has(folderPath)){ 
     expandedFolders.delete(folderPath)
    }else{
        expandedFolders.add(folderPath);
    }

    renderFilesList();
}













function openfile(fileName){

    if(!fileName) return;

    if(openTabs[fileName]){
        currentFile = fileName;
        updateEditor();
        renderTabs();
        renderFilesList();
        return;
    }

    currentFile = fileName
    updateEditorTitle();
    renderTabs();
    renderFilesList();

    vscode.postMessage({
        command: 'loadFile',
        fileName
    });
}



initFolderContextMenu();
initDragAndDrop();