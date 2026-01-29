// @ts-nocheck

const vscode = acquireVsCodeApi();

let currentFile = null;
let openTabs = {};
let files = [];
let folders = [];
let expandedFolders = new Set();
let easyMDE = null;
let cm = null;
let editorTitleElement = null;
let editorTitleInput = null;
let isTitleEditing = false;
let pendingTitleEditFile = null;

let autoSaveTimer = null;
let autoSaveDelay = 750;
let lastSavedContent = {};

let lastTypingAt = 0;
let typingGraceMs = 500;
let lastCheckboxToggleAt = 0;
let checkboxGraceMs = 1500;
let suppressMarkersUntil = 0;

let hiddenMarks = [];
let codeLineHandles = [];
let listLineFlags = new WeakMap();
let lastLineWithFormatting = null;
let hiddenUpdateTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initEvents();
  vscode.postMessage({ command: 'getVault' });
});

window.addEventListener('load', () => {
  const loading = document.getElementById('appLoading');
  if (loading) loading.style.display = 'none';
  document.body.classList.remove('loading');
});


