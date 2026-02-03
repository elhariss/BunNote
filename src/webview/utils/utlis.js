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

function formatTitleFromFile(fileName) {
  if (!fileName) {
    return 'Untitled';
  }
  const parts = fileName.split(/[\\/]/);
  const base = parts[parts.length - 1] || fileName;
  const withoutExt = base.replace(/\.md$/i, '');
  return withoutExt || 'Untitled';
}

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
