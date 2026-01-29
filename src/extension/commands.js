// ============================================
// Command Registration / コマンド登録
// ============================================

const vscode = require("vscode");

function registerCommands(context, state, provider) {
  // Set vault folder / Vaultフォルダを設定
  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.setVault", async () => {
      const folder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        title: "Select BunNote Vault Folder"
      });

      if (folder) {
        state.vaultPath = folder[0].fsPath;
        await vscode.workspace
          .getConfiguration("bunnote")
          .update("vaultPath", state.vaultPath, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage("BunNote vault set to: " + state.vaultPath);
        vscode.commands.executeCommand("bunnote.refreshFiles");
      }
    })
  );

  // Create new note / 新しいノートを作成
  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.createNote", async () => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const title = await vscode.window.showInputBox({
        prompt: "Enter note title",
        placeHolder: "My Note"
      });

      if (title) {
        const fileName = title.endsWith(".md") ? title : `${title}.md`;
        vscode.commands.executeCommand("bunnote.openFile", fileName, true);
      }
    })
  );

  // Refresh file list / ファイルリストを更新
  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.refreshFiles", () => {
      provider.refresh();
    })
  );

  // Open settings / 設定を開く
  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openSettings", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "bunnote");
    })
  );

  // Open file in editor / エディターでファイルを開く
  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openFile", (fileName, isNew = false) => {
      if (provider.view) {
        provider.view.webview.postMessage({
          command: "openFile",
          fileName,
          isNew
        });
      }
    })
  );
}

module.exports = {
  registerCommands
};
