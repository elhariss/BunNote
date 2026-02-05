const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".ico"
]);

/**
 * Sanitize file names by removing protocols and control characters
 * ファイル名からプロトコルと制御文字を削除してサニタイズする
 */
const sanitizeFileName = (name) => {
  if (!name || typeof name !== "string") return name;
  let n = name.trim();

  // Remove file:// protocol / file://プロトコルを削除
  if (n.toLowerCase().startsWith("file:")) {
    n = n.replace(/^file:\/\/*/i, "");
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(n)) {
    n = n.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  }

  // Remove control characters / 制御文字を削除
  n = n.replace(/[\u0000-\u001F\u007F]/g, "");
  // Normalize path separators / パス区切り文字を正規化
  n = n.replace(/\\/g, "/");

  return n;
};

function registerCommands(context, state, providers) {
  const { vaultProvider, editorProvider } = providers;
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
        await editorProvider.openFile(fileName, true);
        vaultProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.createFolder", async () => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const input = await vscode.window.showInputBox({
        prompt: "New folder name",
        placeHolder: "Folder name"
      });

      if (typeof input !== "string") {
        return;
      }

      const trimmed = input.trim();
      const cleaned = trimmed.replace(/[\\/]+/g, "-").replace(/[:*?\"<>|]+/g, "").trim();
      if (!cleaned) {
        vscode.window.showErrorMessage("Invalid folder name");
        return;
      }

      const safeFolder = sanitizeFileName(cleaned);
      if (!safeFolder) {
        vscode.window.showErrorMessage("Invalid folder name");
        return;
      }

      const folderPath = path.join(state.vaultPath, safeFolder);
      if (fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage("A folder with that name already exists");
        return;
      }

      try {
        fs.mkdirSync(folderPath, { recursive: true });
        vscode.window.showInformationMessage("Folder created: " + safeFolder);
        vaultProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to create folder: " + err.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openFile", async (fileName, createIfMissing = false) => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      // Handle URI objects (from tree view clicks)
      // URIオブジェクトを処理（ツリービューのクリックから）
      if (fileName && fileName.fsPath) {
        const ext = path.extname(fileName.fsPath).toLowerCase();
        // Open images with default viewer / 画像はデフォルトビューアで開く
        if (imageExtensions.has(ext)) {
          await vscode.commands.executeCommand("vscode.open", fileName);
          return;
        }
        // Security check: ensure file is within vault / セキュリティチェック：ファイルがvault内にあることを確認
        const relativePath = path.relative(state.vaultPath, fileName.fsPath).split(path.sep).join("/");
        if (!relativePath || relativePath.startsWith("..")) {
          vscode.window.showErrorMessage("File is outside the vault");
          return;
        }
        await editorProvider.openFile(relativePath, createIfMissing);
        return;
      }

      const safeName = sanitizeFileName(fileName);
      if (!safeName) {
        vscode.window.showErrorMessage("Invalid file name");
        return;
      }

      const ext = path.extname(safeName).toLowerCase();
      if (imageExtensions.has(ext)) {
        const filePath = path.join(state.vaultPath, safeName);
        if (!fs.existsSync(filePath)) {
          vscode.window.showErrorMessage("File not found: " + safeName);
          return;
        }
        await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filePath));
        return;
      }

      const normalized = safeName.toLowerCase().endsWith(".md")
        ? safeName
        : `${safeName}.md`;

      const filePath = path.join(state.vaultPath, normalized);
      if (!fs.existsSync(filePath)) {
        if (!createIfMissing) {
          vscode.window.showErrorMessage("File not found: " + normalized);
          return;
        }

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        try {
          fs.writeFileSync(filePath, "", "utf-8");
          vaultProvider.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to create file: " + err.message);
          return;
        }
      }
      await editorProvider.openFile(normalized, createIfMissing);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openInMainEditor", async (item) => {
      const uri = item && item.resourceUri ? item.resourceUri : item;
      if (!uri || !uri.fsPath) {
        return;
      }
      const ext = path.extname(uri.fsPath).toLowerCase();
      if (imageExtensions.has(ext)) {
        await vscode.commands.executeCommand("vscode.open", uri);
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", uri, "bunnote.markdownEditor");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.renameFile", async (item) => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const uri = item && item.resourceUri ? item.resourceUri : item;
      if (!uri || !uri.fsPath) {
        return;
      }

      const relativePath = path.relative(state.vaultPath, uri.fsPath).split(path.sep).join("/");
      if (!relativePath || relativePath.startsWith("..")) {
        vscode.window.showErrorMessage("File is outside the vault");
        return;
      }

      const baseName = path.basename(uri.fsPath);
      const currentExt = path.extname(baseName);
      const nameWithoutExt = baseName.slice(0, baseName.length - currentExt.length);

      const input = await vscode.window.showInputBox({
        prompt: "Rename file",
        value: nameWithoutExt
      });

      if (typeof input !== "string") {
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        vscode.window.showErrorMessage("Invalid file name");
        return;
      }

      const cleaned = trimmed.replace(/[\\/]+/g, "-").replace(/[:*?\"<>|]+/g, "").trim();
      if (!cleaned) {
        vscode.window.showErrorMessage("Invalid file name");
        return;
      }

      const newName = cleaned.endsWith(currentExt) ? cleaned : `${cleaned}${currentExt}`;
      const targetPath = path.join(path.dirname(uri.fsPath), newName);

      if (fs.existsSync(targetPath)) {
        vscode.window.showErrorMessage("A file with that name already exists");
        return;
      }

      try {
        fs.renameSync(uri.fsPath, targetPath);
        vaultProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to rename file: " + err.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.deleteFile", async (item) => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const uri = item && item.resourceUri ? item.resourceUri : item;
      if (!uri || !uri.fsPath) {
        return;
      }

      const relativePath = path.relative(state.vaultPath, uri.fsPath).split(path.sep).join("/");
      if (!relativePath || relativePath.startsWith("..")) {
        vscode.window.showErrorMessage("File is outside the vault");
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Delete file "${path.basename(uri.fsPath)}"?`,
        { modal: true },
        "Delete"
      );

      if (confirm !== "Delete") {
        return;
      }

      try {
        await vscode.workspace.fs.delete(uri, { useTrash: true });
        vaultProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to delete file: " + err.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.renameFolder", async (item) => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const uri = item && item.resourceUri ? item.resourceUri : item;
      if (!uri || !uri.fsPath) {
        return;
      }

      const relativePath = path.relative(state.vaultPath, uri.fsPath).split(path.sep).join("/");
      if (!relativePath || relativePath.startsWith("..")) {
        vscode.window.showErrorMessage("Folder is outside the vault");
        return;
      }

      const baseName = path.basename(uri.fsPath);
      const input = await vscode.window.showInputBox({
        prompt: "Rename folder",
        value: baseName
      });

      if (typeof input !== "string") {
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        vscode.window.showErrorMessage("Invalid folder name");
        return;
      }

      const cleaned = trimmed.replace(/[\\/]+/g, "-").replace(/[:*?\"<>|]+/g, "").trim();
      if (!cleaned) {
        vscode.window.showErrorMessage("Invalid folder name");
        return;
      }

      const targetPath = path.join(path.dirname(uri.fsPath), cleaned);
      if (fs.existsSync(targetPath)) {
        vscode.window.showErrorMessage("A folder with that name already exists");
        return;
      }

      try {
        fs.renameSync(uri.fsPath, targetPath);
        vaultProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to rename folder: " + err.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.deleteFolder", async (item) => {
      if (!state.vaultPath) {
        vscode.window.showErrorMessage("Please set BunNote vault first");
        vscode.commands.executeCommand("bunnote.setVault");
        return;
      }

      const uri = item && item.resourceUri ? item.resourceUri : item;
      if (!uri || !uri.fsPath) {
        return;
      }

      const relativePath = path.relative(state.vaultPath, uri.fsPath).split(path.sep).join("/");
      if (!relativePath || relativePath.startsWith("..")) {
        vscode.window.showErrorMessage("Folder is outside the vault");
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Delete folder "${path.basename(uri.fsPath)}" and all contents?`,
        { modal: true },
        "Delete"
      );

      if (confirm !== "Delete") {
        return;
      }

      try {
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
        vaultProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to delete folder: " + err.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.refreshFiles", () => {
      vaultProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunnote.openSettings", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "@bunnote");
    })
  );
}

module.exports = {
  registerCommands
};
