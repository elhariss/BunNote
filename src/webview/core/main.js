const vscode = acquireVsCodeApi();

let currentFile = null;
let currentFilePath = null;
let fileContent = '';
let vaultPath = null;
let easyMDE = null;
let cm = null;
let editorTitleInput = null;
let isTitleEditing = false;

let autoSaveTimer = null;
let autoSaveDelay = 750;
let lastSavedContent = {};
let lastLocalSaveAt = 0;

let lastTypingAt = 0;
let typingGraceMs = 500;
let lastCheckboxToggleAt = 0;
let checkboxGraceMs = 1500;
let suppressMarkersUntil = 0;

let hiddenMarks = [];
let codeLineHandles = [];
let listLineFlags = new WeakMap();
let listMarkerMarks = new Map();
let lastLineWithFormatting = null;
let hiddenUpdateTimer = null;
let lastHiddenUpdateAt = 0;
let hiddenUpdateMinInterval = 50;
let hiddenUpdateDebounceMs = 80;
let hiddenCursorDebounceMs = 60;
let fastLoadPending = false;
let lastCursorLine = null;
let editorFocused = false;

const isMainEditorMode = document.body.dataset.editorMode === 'main';

if (isMainEditorMode) {
  autoSaveDelay = 2000;
  hiddenUpdateMinInterval = 90;
  hiddenUpdateDebounceMs = 140;
  hiddenCursorDebounceMs = 110;
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

