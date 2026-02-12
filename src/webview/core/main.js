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
  
  const waitForEasyMDE = (attempts = 0, maxAttempts = 20) => {
    if (typeof EasyMDE !== 'undefined') {
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
          loading.innerHTML = '<div style="padding: 20px; color: var(--vscode-errorForeground);">Failed to load editor. Please reload the window.</div>';
        }
      }
    } else if (attempts < maxAttempts) {
      setTimeout(() => waitForEasyMDE(attempts + 1, maxAttempts), 100);
    } else {
      console.error('EasyMDE failed to load after multiple attempts');
      const loading = document.getElementById('appLoading');
      if (loading) {
        loading.innerHTML = '<div style="padding: 20px; color: var(--vscode-errorForeground);">Failed to load editor library. Please reload the window or check your internet connection.</div>';
      }
    }
  };
  
  waitForEasyMDE();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const loading = document.getElementById('appLoading');
    if (loading) loading.style.display = 'none';
    document.body.classList.remove('loading');
  }, 100);
});

setTimeout(() => {
  const loading = document.getElementById('appLoading');
  if (loading && loading.style.display !== 'none') {
    console.warn('Loading timeout reached, forcing removal of loading screen');
    loading.style.display = 'none';
    document.body.classList.remove('loading');
  }
}, 5000);

