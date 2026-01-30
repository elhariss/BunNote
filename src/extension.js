// ============================================
// BunNote Extension Entry Point
// BunNote拡張機能のエントリーポイント
// ============================================

const vscode = require("vscode");
const { registerCommands } = require("./extension/commands");
const { ViewProvider } = require("./extension/viewProvider");
const { EditorProvider } = require("./extension/editorProvider");

function activate(context) {
  const config = vscode.workspace.getConfiguration("bunnote");
  let vaultPath = config.get("vaultPath");
  const defaultVaultPath = config.get("defaultVaultPath");
  const autoUseDefaultVault = config.get("autoUseDefaultVault", true);

  if (!vaultPath && autoUseDefaultVault && defaultVaultPath) {
    vaultPath = defaultVaultPath;
  }

  const state = { vaultPath };
  const provider = new ViewProvider(context, () => state.vaultPath);
  registerCommands(context, state, provider);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bunNoteView", provider)
  );

  context.subscriptions.push(
    EditorProvider.register(context)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openInEditor", async (uri) => {
      if (uri && uri.fsPath) {
        await vscode.commands.executeCommand("vscode.openWith", uri, "bunnote.markdownEditor");
      }
    })
  );
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
