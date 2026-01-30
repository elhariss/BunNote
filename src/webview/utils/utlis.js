/**
 * Escape HTML special characters / HTML特殊文字をエスケープ
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function getCurrentDirectory(fileName) {
  if (!fileName) {
    return '';
  }
  const idx = fileName.lastIndexOf('/');
  return idx === -1 ? '' : fileName.slice(0, idx + 1);
}

/**
 * Format file name to display title / ファイル名を表示用タイトルにフォーマット
 */
function formatTitleFromFile(fileName) {
  if (!fileName) {
    return 'Untitled';
  }
  const parts = fileName.split(/[\\/]/);
  const base = parts[parts.length - 1] || fileName;
  const withoutExt = base.replace(/\.md$/i, '');
  return withoutExt || 'Untitled';
}

/**
 * Build new relative file name from title / タイトルから新しい相対ファイル名を構築
 */
function buildNewRelativeName(rawTitle, targetFile = currentFile) {
  if (!targetFile) {
    return null;
  }
  const trimmed = (rawTitle || '').trim();
  if (!trimmed) {
    return null;
  }
  let newBase = trimmed;
  if (!newBase.toLowerCase().endsWith('.md')) {
    newBase += '.md';
  }
  newBase = newBase.replace(/[\\/]+/g, '-').replace(/[:*?"<>|]+/g, '').trim();
  if (!newBase) {
    return null;
  }
  const dir = getCurrentDirectory(targetFile);
  return dir ? dir + newBase : newBase;
}
