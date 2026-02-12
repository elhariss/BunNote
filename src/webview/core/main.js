const vscode = acquireVsCodeApi();

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ServiceWorker')) {
    console.warn('Service worker error suppressed (VS Code webview limitation)');
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('ServiceWorker')) {
    console.warn('Service worker promise rejection suppressed (VS Code webview limitation)');
    event.preventDefault();
    return false;
  }
});

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
  try {
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
  } catch (error) {
    console.error('Failed to initialize editor:', error);
    const loading = document.getElementById('appLoading');
    if (loading) {
      loading.innerHTML = '<div style="color: var(--vscode-errorForeground);">Failed to load editor. Please reload the window.</div>';
    }
  }
});

window.addEventListener('load', () => {
  const loading = document.getElementById('appLoading');
  if (loading) loading.style.display = 'none';
  document.body.classList.remove('loading');
  
  if (!easyMDE) {
    console.warn('Editor not initialized, retrying...');
    try {
      initEditor();
      initEvents();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }
});

setTimeout(() => {
  const loading = document.getElementById('appLoading');
  if (loading && loading.style.display !== 'none') {
    console.warn('Loading timeout reached, forcing removal of loading screen');
    loading.style.display = 'none';
    document.body.classList.remove('loading');
    
    if (!easyMDE) {
      try {
        initEditor();
        initEvents();
      } catch (error) {
        console.error('Fallback initialization failed:', error);
      }
    }
  }
}, 5000);

