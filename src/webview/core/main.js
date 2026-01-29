// ============================================
// Global State / グローバル状態
// ============================================

const vscode = acquireVsCodeApi();

// File and editor state / ファイルとエディターの状態
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

// Auto-save state / 自動保存の状態
let autoSaveTimer = null;
let autoSaveDelay = 750;
let lastSavedContent = {};

// Markdown syntax hiding state / マークダウン構文非表示の状態
let lastTypingAt = 0;
let typingGraceMs = 500;
let lastCheckboxToggleAt = 0;
let checkboxGraceMs = 1500;
let suppressMarkersUntil = 0;

// CodeMirror markers / CodeMirrorマーカー
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



// ============================================
// Vault Collapse / Vaultの折りたたみ
// ============================================

function toggleVaultCollapse() {
  const sidebar = document.querySelector('.sidebar');
  const filesList = document.getElementById('filesList');
  const collapseBtn = document.getElementById('collapseBtn');
  const icon = collapseBtn.querySelector('i');
  
  sidebar.classList.toggle('collapsed');
  filesList.classList.toggle('collapsed');
  
  if (filesList.classList.contains('collapsed')) {
    icon.className = 'ph ph-caret-right';
    collapseBtn.title = 'Expand';
  } else {
    icon.className = 'ph ph-caret-down';
    collapseBtn.title = 'Collapse';
  }
}
