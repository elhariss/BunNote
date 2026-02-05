const vscode = acquireVsCodeApi();

let currentFile = null;
let currentFilePath = null;
let fileContent = '';
let vaultPath = null;
let easyMDE = null;
let cm = null;
let editorTitleInput = null;
let isTitleEditing = false;
let pendingEdit = null;

let autoSaveTimer = null;
let autoSaveDelay = 750;
let lastSavedContent = {};
let lastLocalSaveAt = 0;
let lastLocalSaveFile = null;
let ignoreFileChangedMs = 1500;

let lastTypingAt = 0;
let typingGraceMs = 500;
let lastCheckbox = 0;
let checkboxGraceMs = 1500;
let suppressUntil = 0;

let hiddenMarks = [];
let codeLineHandles = [];
let listLineFlags = new WeakMap();
let listMarkerMarks = new Map();
let lastFormatLine = null;
let hiddenUpdateTimer = null;
let lastHiddenUpdateAt = 0;
let updateMinInt = 50;
let updateDebounce = 80;
let cursorDebounce = 60;
let fastLoadPending = false;
let lastCursorLine = null;
let editorFocused = false;

const isMainEditorMode = document.body.dataset.editorMode === 'main';

if (isMainEditorMode) {
  autoSaveDelay = 2000;
  updateMinInt = 90;
  updateDebounce = 140;
  cursorDebounce = 110;
  imageUpdateDelay = 500;
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initEvents();


  if (isMainEditorMode) {
    const sidebar = document.querySelector('.sidebar');
    const editorArea = document.querySelector('.editor_area');
    const editorHeader = document.querySelector('.editor_header');
    const editorContainer = document.querySelector('.editor_container');

    if (sidebar) sidebar.style.display = 'none';
    if (editorHeader) editorHeader.style.display = 'none';
    if (editorArea) {
      editorArea.style.width = '100%';
      editorArea.style.height = '100vh';
      editorArea.style.flex = '1';
    }
    if (editorContainer) {
      editorContainer.style.width = '100%';
      editorContainer.style.height = '100%';
    }

    vscode.postMessage({ command: 'ready' });
  }
});

window.addEventListener('load', () => {
  const loading = document.getElementById('appLoading');
  if (loading) loading.style.display = 'none';
  document.body.classList.remove('loading');
});

