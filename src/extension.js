// ============================================
// BunNote Extension Entry Point
// BunNote拡張機能のエントリーポイント
// ============================================

const vscode = require("vscode");
const { registerCommands } = require("./extension/commands");
const { ViewProvider } = require("./extension/viewProvider");

// Extension activation / 拡張機能の有効化
function activate(context) {
  // Load vault configuration / Vault設定を読み込む
  const config = vscode.workspace.getConfiguration("bunnote");
  let vaultPath = config.get("vaultPath");
  const defaultVaultPath = config.get("defaultVaultPath");
  const autoUseDefaultVault = config.get("autoUseDefaultVault", true);

  // Auto-use default vault if configured / デフォルトVaultを自動使用
  if (!vaultPath && autoUseDefaultVault && defaultVaultPath) {
    vaultPath = defaultVaultPath;
  }

  // Initialize state and provider / 状態とプロバイダーを初期化
  const state = { vaultPath };
  const provider = new ViewProvider(context, () => state.vaultPath);
  registerCommands(context, state, provider);
  
  // Register webview provider / Webviewプロバイダーを登録
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bunNoteView", provider)
  );
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
