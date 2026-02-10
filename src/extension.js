const vscode = require("vscode");
const { registerCommands } = require("./extension/commands");
const { VaultTreeProvider } = require("./extension/vaultTreeProvider");
const { ViewProvider } = require("./extension/viewProvider");
const { EditorProvider } = require("./extension/editorProvider");
const { initLocalization, t } = require("./locales/i18n");

/**
 * Extension activation function / 拡張機能のアクティベーション関数
 */
function activate(context) {
  initLocalization(context);

  const config = vscode.workspace.getConfiguration("bunnote");
  let vaultPath = config.get("vaultPath");
  const defaultVaultPath = config.get("defaultVaultPath");
  const autoUseDefaultVault = config.get("autoUseDefaultVault", true);

  if (!vaultPath && autoUseDefaultVault && defaultVaultPath) {
    vaultPath = defaultVaultPath;
  }

  const state = { vaultPath };
  const vaultProvider = new VaultTreeProvider(() => state.vaultPath);
  const editorProvider = new ViewProvider(context, () => state.vaultPath);
  registerCommands(context, state, { vaultProvider, editorProvider });

  const vaultTreeView = vscode.window.createTreeView("bunNoteVault", {
    treeDataProvider: vaultProvider,
    dragAndDropController: vaultProvider.dragAndDropController
  });
  context.subscriptions.push(vaultTreeView);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bunNoteEditor", editorProvider)
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

  /**
   * Listen for configuration changes and prompt reload
   * 設定変更を監視してリロードを促す
   */
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("bunnote")) {
        return;
      }

      const action = t("dialog.reloadWindow") || "Reload Window";
      const cancel = t("dialog.later") || "Later";
      vscode.window
        .showInformationMessage(
          t("message.settingsUpdated") || "BunNote settings have been updated. Reload VS Code to apply changes?",
          action,
          cancel
        )
        .then((selectedAction) => {
          if (selectedAction === action) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    })
  );
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};

