const vscode = require("vscode");
const { registerCommands } = require("./extension/commands");
const { ViewProvider } = require("./extension/viewProvider");

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
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
