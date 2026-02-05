
/**
 * Extract directory path from file name
 * ファイル名からディレクトリパスを抽出
 */
function getCurrentDirectory(fileName) {
  if (!fileName) {
    return '';
  }
  const idx = fileName.lastIndexOf('/');
  return idx === -1 ? '' : fileName.slice(0, idx + 1);
}

function formatTitle(fileName) {
  if (!fileName) {
    return 'Untitled';
  }
  const parts = fileName.split(/[\\/]/);
  const base = parts[parts.length - 1] || fileName;
  const withoutExt = base.replace(/\.md$/i, '');
  return withoutExt || 'Untitled';
}


/**
 * Build relative path from title, ensuring .md extension and cleaning invalid characters
 * タイトルから相対パスを構築し、.md拡張子を確保して無効な文字をクリーンアップ
 */
function buildRelPath(rawTitle, targetFile = currentFile) {
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
