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

const sanitizeFileName = (name) => {
  if (!name || typeof name !== "string") return name;
  let n = name.trim();

  if (n.toLowerCase().startsWith("file:")) {
    n = n.replace(/^file:\/\/*/i, "");
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(n)) {
    n = n.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  }

  n = n.replace(/[\u0000-\u001F\u007F]/g, "");
  n = n.replace(/\\/g, "/");

  return n;
};

const isImageFile = (name) => {
  const ext = path.extname(name || "").toLowerCase();
  return imageExtensions.has(ext);
};

class ViewProvider {
  constructor(context, getVaultPath) {
    this.context = context;
    this.getVaultPath = getVaultPath;
    this.view = null;
    this.pendingOpenFile = null;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.cacheKey = "bunnote.cachedIndex";
    this.cache = this.context.globalState.get(this.cacheKey, null);
    this.fileWatcher = null;
    this.setupFileWatcher();
  }

  async openFile(fileName, createIfMissing = false) {
    const vaultPath = this.getVaultPath();
    if (!vaultPath) {
      vscode.window.showErrorMessage("Please set BunNote vault first");
      return;
    }

    const safeName = sanitizeFileName(fileName);
    if (!safeName) {
      vscode.window.showErrorMessage("Invalid file name");
      return;
    }

    const normalized = safeName.toLowerCase().endsWith(".md")
      ? safeName
      : `${safeName}.md`;

    const filePath = path.join(vaultPath, normalized);
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
        this.refresh();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to create file: " + err.message);
        return;
      }
    }

    if (!this.view) {
      this.pendingOpenFile = normalized.replace(/\\/g, "/");
      await vscode.commands.executeCommand("workbench.view.extension.bunNote");
      await vscode.commands.executeCommand("bunNoteEditor.focus");
      return;
    }

    this.view.webview.postMessage({
      command: "openFile",
      fileName: normalized.replace(/\\/g, "/")
    });
  }

  async createFolder(parentFolder = "") {
    const vaultPath = this.getVaultPath();
    if (!vaultPath) {
      vscode.window.showErrorMessage("Please set BunNote vault first");
      return;
    }

    const safeParent = sanitizeFileName(parentFolder || "");
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

    const relative = safeParent ? path.join(safeParent, cleaned) : cleaned;
    const safeFolder = sanitizeFileName(relative);
    if (!safeFolder) {
      vscode.window.showErrorMessage("Invalid folder name");
      return;
    }

    const folderPath = path.join(vaultPath, safeFolder);
    if (fs.existsSync(folderPath)) {
      vscode.window.showErrorMessage("A folder with that name already exists");
      return;
    }

    try {
      fs.mkdirSync(folderPath, { recursive: true });
      vscode.window.showInformationMessage("Folder created: " + safeFolder);
      this.refresh();
    } catch (err) {
      vscode.window.showErrorMessage("Failed to create folder: " + err.message);
    }
  }

  setupFileWatcher() {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }

    const vaultPath = this.getVaultPath();
    if (vaultPath && fs.existsSync(vaultPath)) {
      const pattern = new vscode.RelativePattern(vaultPath, "**/*.{md,png,jpg,jpeg,gif,svg,webp,bmp,ico}");
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

      this.fileWatcher.onDidCreate(() => {
        this.refresh();
      });

      this.fileWatcher.onDidChange((uri) => {
        if (this.view) {
          const vaultPath = this.getVaultPath();
          const relativePath = path.relative(vaultPath, uri.fsPath).split(path.sep).join("/");
          this.view.webview.postMessage({
            command: "fileChanged",
            fileName: relativePath
          });
        }
      });

      this.fileWatcher.onDidDelete(() => {
        this.refresh();
      });

      this.context.subscriptions.push(this.fileWatcher);
    }
  }

  refresh() {
    if (this.view) {
      this.view.webview.postMessage({ command: "refresh" });
    }
    this.setupFileWatcher();
  }

  async getMarkdownFiles() {
    const vaultPath = this.getVaultPath();
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { files: [], folders: [] };
    }

    const files = [];
    const folders = [];
    const yieldToEventLoop = () => new Promise(resolve => setImmediate(resolve));

    const walkDir = async (dir) => {
      try {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith(".")) {
            continue;
          }
          const fullPath = path.join(dir, item.name);

          if (item.isDirectory()) {
            const relativePath = path.relative(vaultPath, fullPath).split(path.sep).join("/");
            folders.push(relativePath);
            if (folders.length % 200 === 0) {
              await yieldToEventLoop();
            }
            await walkDir(fullPath);
          } else if (item.isFile()) {
            const isMarkdown = item.name.toLowerCase().endsWith(".md");
            const isImage = isImageFile(item.name);
            if (!isMarkdown && !isImage) {
              continue;
            }
            const relativePath = path.relative(vaultPath, fullPath).split(path.sep).join("/");
            files.push({
              name: item.name,
              path: relativePath,
              fullPath: fullPath,
              type: isImage ? "image" : "note"
            });
            if (files.length % 200 === 0) {
              await yieldToEventLoop();
            }
          }
        }
      } catch (err) {
        console.error("Error reading directory:", err);
      }
    };

    await walkDir(vaultPath);
    const result = {
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
      folders: folders.sort((a, b) => a.localeCompare(b))
    };

    this.cache = {
      vaultPath,
      ...result,
      updatedAt: Date.now()
    };
    this.context.globalState.update(this.cacheKey, this.cache);

    return result;
  }

  resolveWebviewView(view) {
    this.view = view;
    const webviewRoot = vscode.Uri.file(path.join(this.context.extensionPath, "src", "webview"));
    const initialVaultPath = this.getVaultPath();
    const initialRoots = [webviewRoot];
    if (initialVaultPath) {
      initialRoots.push(vscode.Uri.file(initialVaultPath));
    }
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: initialRoots
    };
    view.webview.html = this.getHtml();

    if (this.pendingOpenFile) {
      view.webview.postMessage({
        command: "openFile",
        fileName: this.pendingOpenFile
      });
      this.pendingOpenFile = null;
    }

    view.webview.onDidReceiveMessage(async (msg) => {
      const vaultPath = this.getVaultPath();

      const performRename = async (safeOldName, safeNewName, source) => {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          view.webview.postMessage({ command: "renameResult", success: false, error: "Vault not configured", source });
          return;
        }

        if (!safeOldName || !safeNewName) {
          view.webview.postMessage({ command: "renameResult", success: false, error: "Invalid file name", source });
          return;
        }

        const oldPath = path.join(vaultPath, safeOldName);
        const newPath = path.join(vaultPath, safeNewName);

        if (safeOldName === safeNewName) {
          view.webview.postMessage({ command: "renameResult", success: true, oldName: safeOldName, newName: safeNewName, source });
          return;
        }

        if (!fs.existsSync(oldPath)) {
          view.webview.postMessage({ command: "renameResult", success: false, error: "Original note not found", source });
          return;
        }

        if (fs.existsSync(newPath)) {
          view.webview.postMessage({ command: "renameResult", success: false, error: "A note with that name already exists", source });
          return;
        }

        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          const oldUri = vscode.Uri.file(oldPath);
          const newUri = vscode.Uri.file(newPath);

          const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
          const mainEditorTabs = tabs.filter(tab => {
            if (tab.input instanceof vscode.TabInputCustom) {
              return tab.input.uri.toString() === oldUri.toString();
            }
            return false;
          });

          fs.renameSync(oldPath, newPath);
          vscode.window.showInformationMessage("Note renamed to: " + safeNewName);

          for (const tab of mainEditorTabs) {
            await vscode.window.tabGroups.close(tab);
          }

          if (mainEditorTabs.length > 0) {
            await vscode.commands.executeCommand("vscode.openWith", newUri, "bunnote.markdownEditor");
          }

          view.webview.postMessage({
            command: "renameResult",
            success: true,
            oldName: safeOldName,
            newName: safeNewName,
            source
          });
          this.refresh();
        } catch (err) {
          view.webview.postMessage({ command: "renameResult", success: false, error: err.message, source });
        }
      };

      if (msg.command === "getVault") {
        if (vaultPath) {
          view.webview.options = {
            enableScripts: true,
            localResourceRoots: [webviewRoot, vscode.Uri.file(vaultPath)]
          };
        }
        const cached = this.cache;
        if (cached && cached.vaultPath === vaultPath) {
          view.webview.postMessage({
            command: "vaultStatus",
            vaultPath: vaultPath,
            files: cached.files || [],
            folders: cached.folders || []
          });

          this.getMarkdownFiles().then(entries => {
            view.webview.postMessage({
              command: "vaultStatus",
              vaultPath: vaultPath,
              files: entries.files,
              folders: entries.folders
            });
          });
        } else {
          const entries = await this.getMarkdownFiles();
          view.webview.postMessage({
            command: "vaultStatus",
            vaultPath: vaultPath,
            files: entries.files,
            folders: entries.folders
          });
        }
      } else if (msg.command === "setVault") {
        vscode.commands.executeCommand("bunnote.setVault");
      } else if (msg.command === "resolveImage") {
        const requestId = msg.requestId;
        const imagePath = typeof msg.imagePath === 'string' ? msg.imagePath.trim() : '';
        const safeFileName = sanitizeFileName(msg.fileName || '');

        const respond = (uri) => view.webview.postMessage({
          command: "resolvedImage",
          requestId,
          uri: uri || null
        });

        if (!requestId || !imagePath || !vaultPath) {
          respond(null);
          return;
        }

        const isRemote = /^(https?:|data:|vscode-resource:|vscode-webview-resource:)/i.test(imagePath);
        if (isRemote) {
          respond(imagePath);
          return;
        }

        const cleanedPath = imagePath.replace(/^file:\/*/i, '').replace(/\\/g, '/');
        const baseDir = safeFileName
          ? path.dirname(path.join(vaultPath, safeFileName))
          : vaultPath;
        const resolvedPath = path.isAbsolute(cleanedPath)
          ? cleanedPath
          : path.resolve(baseDir, cleanedPath);

        const normalizedVault = path.resolve(vaultPath);
        const normalizedTarget = path.resolve(resolvedPath);
        const relative = path.relative(normalizedVault, normalizedTarget);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          respond(null);
          return;
        }

        if (!fs.existsSync(normalizedTarget)) {
          respond(null);
          return;
        }

        const uri = view.webview.asWebviewUri(vscode.Uri.file(normalizedTarget)).toString();
        respond(uri);
      } else if (msg.command === "createNote") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const rawTitle = (msg.title || "").trim();
        const displayTitle = rawTitle || "Untitled";

        const makeUniqueName = (baseTitle) => {
          const base = baseTitle.trim() || "Untitled";
          let candidate = base;
          let counter = 0;
          while (true) {
            const suffix = counter === 0 ? "" : ` ${counter}`;
            const name = `${candidate}${suffix}.md`;
            const safe = sanitizeFileName(name);
            const target = path.join(vaultPath, safe);
            if (!fs.existsSync(target)) {
              return { safeName: safe, title: `${candidate}${suffix}` };
            }
            counter += 1;
          }
        };

        const resolved = makeUniqueName(displayTitle);
        const safeName = resolved.safeName;
        if (!safeName) {
          vscode.window.showErrorMessage("Invalid note title");
          return;
        }

        const filePath = path.join(vaultPath, safeName);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const content = "";
        try {
          fs.writeFileSync(filePath, content, "utf-8");
          view.webview.postMessage({
            command: "newNote",
            fileName: safeName,
            content
          });
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to create note: " + err.message);
        }
      } else if (msg.command === "openSettings") {
        vscode.commands.executeCommand("bunnote.openSettings");
      } else if (msg.command === "loadFile") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeName = sanitizeFileName(msg.fileName);
        if (!safeName) {
          console.error('Invalid file name for loadFile:', msg.fileName);
          vscode.window.showErrorMessage('Invalid file name');
          return;
        }

        const filePath = path.join(vaultPath, safeName);
        try {
          const content = await fs.promises.readFile(filePath, "utf-8");
          view.webview.postMessage({
            command: "fileLoaded",
            fileName: msg.fileName,
            filePath: filePath,
            content: content
          });
        } catch (err) {
          vscode.window.showErrorMessage("Failed to load file: " + err.message);
        }
      } else if (msg.command === "saveFile") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeName = sanitizeFileName(msg.fileName);
        if (!safeName) {
          console.error('Invalid file name for saveFile:', msg.fileName);
          vscode.window.showErrorMessage('Invalid file name');
          return;
        }

        let filePath;
        if (safeName.includes("/") || safeName.includes("\\")) {
          filePath = path.join(vaultPath, safeName);
        } else {
          filePath = path.join(vaultPath, safeName.endsWith('.md') ? safeName : `${safeName}.md`);
        }

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        try {
          fs.writeFileSync(filePath, msg.content, "utf-8");
          if (!msg.isAutoSave) {
            vscode.window.showInformationMessage("Note saved: " + msg.fileName);
            this.refresh();
          }
        } catch (err) {
          vscode.window.showErrorMessage("Failed to save file: " + err.message);
        }
      } else if (msg.command === "confirmDeleteFile") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeName = sanitizeFileName(msg.fileName);
        if (!safeName) {
          console.error('Invalid file name for deleteFile:', msg.fileName);
          vscode.window.showErrorMessage('Invalid file name');
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `Delete file "${msg.fileName}"?`,
          { modal: true },
          "Delete"
        );

        if (confirm !== "Delete") {
          return;
        }

        const filePath = path.join(vaultPath, safeName);
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(filePath), { useTrash: true });
          vscode.window.showInformationMessage("File deleted: " + msg.fileName);
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to delete file: " + err.message);
        }
      } else if (msg.command === "duplicateFile") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeName = sanitizeFileName(msg.fileName);
        if (!safeName) {
          console.error('Invalid file name for duplicateFile:', msg.fileName);
          vscode.window.showErrorMessage('Invalid file name');
          return;
        }

        const sourcePath = path.join(vaultPath, safeName);
        if (!fs.existsSync(sourcePath)) {
          vscode.window.showErrorMessage("Note not found: " + msg.fileName);
          return;
        }

        const dir = path.dirname(safeName);
        const base = path.basename(safeName, path.extname(safeName));
        const ext = path.extname(safeName) || ".md";
        const isMarkdown = safeName.toLowerCase().endsWith(".md");

        let copyName = `${base} copy${ext}`;
        let counter = 2;
        let targetRelative = dir === "." ? copyName : path.join(dir, copyName);
        while (fs.existsSync(path.join(vaultPath, targetRelative))) {
          copyName = `${base} copy ${counter}${ext}`;
          targetRelative = dir === "." ? copyName : path.join(dir, copyName);
          counter += 1;
        }

        try {
          const targetPath = path.join(vaultPath, targetRelative);
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          if (isMarkdown) {
            const content = fs.readFileSync(sourcePath, "utf-8");
            fs.writeFileSync(targetPath, content, "utf-8");
          } else {
            fs.copyFileSync(sourcePath, targetPath);
          }
          vscode.window.showInformationMessage("File duplicated: " + targetRelative);
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to duplicate file: " + err.message);
        }
      } else if (msg.command === "openAsset") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeName = sanitizeFileName(msg.fileName);
        if (!safeName) {
          vscode.window.showErrorMessage("Invalid file name");
          return;
        }

        const filePath = path.join(vaultPath, safeName);
        if (!fs.existsSync(filePath)) {
          vscode.window.showErrorMessage("File not found: " + msg.fileName);
          return;
        }

        const fileUri = vscode.Uri.file(filePath);
        vscode.commands.executeCommand("vscode.open", fileUri);
      } else if (msg.command === "renameFile") {
        const safeOldName = sanitizeFileName(msg.oldName);
        const safeNewName = sanitizeFileName(msg.newName);
        await performRename(safeOldName, safeNewName, msg.source);
      } else if (msg.command === "requestRename") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeOldName = sanitizeFileName(msg.fileName);
        if (!safeOldName) {
          vscode.window.showErrorMessage("Invalid file name");
          return;
        }

        const oldExt = path.extname(safeOldName);
        const baseName = path.basename(safeOldName, oldExt);
        const input = await vscode.window.showInputBox({
          prompt: "Edit note title",
          value: baseName
        });

        if (typeof input !== "string") {
          return;
        }

        const trimmed = input.trim();
        const cleaned = trimmed.replace(/[\\/]+/g, "-").replace(/[:*?\"<>|]+/g, "").trim();
        if (!cleaned) {
          vscode.window.showErrorMessage("Invalid note title");
          return;
        }

        let newBase = cleaned;
        const hasExt = path.extname(newBase).length > 0;
        if (!hasExt) {
          newBase += oldExt || ".md";
        }

        const dir = path.dirname(safeOldName);
        const relativeNew = dir && dir !== "." ? path.join(dir, newBase) : newBase;
        const safeNewName = sanitizeFileName(relativeNew);

        await performRename(safeOldName, safeNewName, msg.source || "contextMenu");
      } else if (msg.command === "requestRenameFolder") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeFolder = sanitizeFileName(msg.folderPath);
        if (!safeFolder) {
          vscode.window.showErrorMessage("Invalid folder name");
          return;
        }

        const baseName = path.basename(safeFolder);
        const input = await vscode.window.showInputBox({
          prompt: "Rename folder",
          value: baseName
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

        const parentDir = path.dirname(safeFolder);
        const relativeNew = parentDir && parentDir !== "." ? path.join(parentDir, cleaned) : cleaned;
        const safeNewFolder = sanitizeFileName(relativeNew);

        const oldPath = path.join(vaultPath, safeFolder);
        const newPath = path.join(vaultPath, safeNewFolder);

        if (safeFolder === safeNewFolder) {
          return;
        }

        if (!fs.existsSync(oldPath)) {
          vscode.window.showErrorMessage("Folder not found: " + safeFolder);
          return;
        }

        if (fs.existsSync(newPath)) {
          vscode.window.showErrorMessage("A folder with that name already exists");
          return;
        }

        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          fs.renameSync(oldPath, newPath);
          vscode.window.showInformationMessage("Folder renamed to: " + safeNewFolder);
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to rename folder: " + err.message);
        }
      } else if (msg.command === "requestCreateFolder") {
        await this.createFolder(msg.parentFolder || "");
      } else if (msg.command === "deleteFolder") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeFolder = sanitizeFileName(msg.folderPath);
        if (!safeFolder) {
          vscode.window.showErrorMessage("Invalid folder name");
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `Delete folder "${safeFolder}" and all its contents?`,
          { modal: true },
          "Delete"
        );

        if (confirm !== "Delete") {
          return;
        }

        const folderPath = path.join(vaultPath, safeFolder);
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
          vscode.window.showInformationMessage("Folder deleted: " + safeFolder);
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to delete folder: " + err.message);
        }
      } else if (msg.command === "moveFile") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeSource = sanitizeFileName(msg.fileName);
        const safeTargetFolder = sanitizeFileName(msg.targetFolder || "");
        if (!safeSource && safeSource !== "") {
          vscode.window.showErrorMessage("Invalid file name");
          return;
        }

        const baseName = path.basename(safeSource);
        const targetRelative = safeTargetFolder ? path.join(safeTargetFolder, baseName) : baseName;
        const safeTarget = sanitizeFileName(targetRelative);

        if (!safeTarget || safeTarget === safeSource) {
          return;
        }

        const oldPath = path.join(vaultPath, safeSource);
        const newPath = path.join(vaultPath, safeTarget);

        if (!fs.existsSync(oldPath)) {
          vscode.window.showErrorMessage("Note not found: " + safeSource);
          return;
        }

        if (fs.existsSync(newPath)) {
          vscode.window.showErrorMessage("A note with that name already exists in the target folder");
          return;
        }

        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          fs.renameSync(oldPath, newPath);
          view.webview.postMessage({
            command: "renameResult",
            success: true,
            oldName: safeSource,
            newName: safeTarget,
            source: "move"
          });
          this.refresh();
        } catch (err) {
          vscode.window.showErrorMessage("Failed to move note: " + err.message);
        }
      } else if (msg.command === "moveFolder") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeSource = sanitizeFileName(msg.folderPath);
        const safeTargetFolder = sanitizeFileName(msg.targetFolder || "");
        if (!safeSource && safeSource !== "") {
          vscode.window.showErrorMessage("Invalid folder name");
          return;
        }

        if (safeTargetFolder && (safeTargetFolder === safeSource || safeTargetFolder.startsWith(safeSource + "/"))) {
          vscode.window.showErrorMessage("Cannot move a folder into itself");
          return;
        }

        const baseName = path.basename(safeSource);
        const targetRelative = safeTargetFolder ? path.join(safeTargetFolder, baseName) : baseName;
        const safeTarget = sanitizeFileName(targetRelative);

        if (!safeTarget || safeTarget === safeSource) {
          return;
        }

        const oldPath = path.join(vaultPath, safeSource);
        const newPath = path.join(vaultPath, safeTarget);

        if (!fs.existsSync(oldPath)) {
          vscode.window.showErrorMessage("Folder not found: " + safeSource);
          return;
        }

        if (fs.existsSync(newPath)) {
          vscode.window.showErrorMessage("A folder with that name already exists in the target folder");
          return;
        }

        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          fs.renameSync(oldPath, newPath);
          view.webview.postMessage({
            command: "folderMoveResult",
            success: true,
            oldPath: safeSource,
            newPath: safeTarget
          });
          this.refresh();
        } catch (err) {
          view.webview.postMessage({
            command: "folderMoveResult",
            success: false,
            error: err.message
          });
        }
      } else if (msg.command === "openInMainEditor") {
        if (!vaultPath) {
          vscode.window.showErrorMessage("Please set BunNote vault first");
          return;
        }

        const safeFileName = sanitizeFileName(msg.fileName);
        if (!safeFileName) {
          vscode.window.showErrorMessage("Invalid file name");
          return;
        }

        const filePath = path.join(vaultPath, safeFileName);
        if (!fs.existsSync(filePath)) {
          vscode.window.showErrorMessage("File not found: " + msg.fileName);
          return;
        }

        const fileUri = vscode.Uri.file(filePath);
        vscode.commands.executeCommand("vscode.openWith", fileUri, "bunnote.markdownEditor");
      } else if (msg.command === "showError") {
        vscode.window.showErrorMessage(msg.message || "An error occurred");
      } else if (msg.command === "showMessage") {
        const message = msg.message || "Operation completed";
        if (msg.type === "error") {
          vscode.window.showErrorMessage(message);
        } else if (msg.type === "warning") {
          vscode.window.showWarningMessage(message);
        } else {
          vscode.window.showInformationMessage(message);
        }
      }
    });

    view.webview.postMessage({ command: "getVault" });
  }

  getHtml() {
    const config = vscode.workspace.getConfiguration("bunnote");
    const markerColorMode = config.get("colorMarkers", false) ? "on" : "off";
    const editorFontSize = config.get("editorFontSize", 14);
    const htmlPath = path.join(this.context.extensionPath, "src", "webview", "index.html");
    const cssPath = path.join(this.context.extensionPath, "src", "webview", "css", "style.css");
    const editorCssPath = path.join(this.context.extensionPath, "src", "webview", "css", "editor.css");
    const utilsPath = path.join(this.context.extensionPath, "src", "webview", "utils", "utlis.js");
    const editorPath = path.join(this.context.extensionPath, "src", "webview", "core", "editor.js");
    const fileManagerPath = path.join(this.context.extensionPath, "src", "webview", "UI", "fileManager.js");
    const eventsPath = path.join(this.context.extensionPath, "src", "webview", "handlers", "events.js");
    const mainPath = path.join(this.context.extensionPath, "src", "webview", "core", "main.js");

    const toWebviewUri = (filePath) =>
      this.view ? this.view.webview.asWebviewUri(vscode.Uri.file(filePath)).toString() : "";

    const cssUri = toWebviewUri(cssPath);
    const editorCssUri = toWebviewUri(editorCssPath);
    const utilsUri = toWebviewUri(utilsPath);
    const editorUri = toWebviewUri(editorPath);
    const fileManagerUri = toWebviewUri(fileManagerPath);
    const eventsUri = toWebviewUri(eventsPath);
    const mainUri = toWebviewUri(mainPath);

    try {
      const html = fs.readFileSync(htmlPath, "utf8");
      return html
        .replace("{{CSS_URI}}", cssUri)
        .replace("{{EDITOR_CSS_URI}}", editorCssUri)
        .replace("{{UTILS_URI}}", utilsUri)
        .replace("{{EDITOR_URI}}", editorUri)
        .replace("{{FILE_MANAGER_URI}}", fileManagerUri)
        .replace("{{EVENTS_URI}}", eventsUri)
        .replace("{{MAIN_URI}}", mainUri)
        .replace("{{EDITOR_MODE}}", "sidebar")
        .replace("{{MARKER_COLOR_MODE}}", markerColorMode)
        .replace("{{EDITOR_FONT_SIZE}}", String(editorFontSize));
    } catch (err) {
      console.error("Failed to load webview HTML:", err);
      return "<html><body><h3>Failed to load BunNote view.</h3></body></html>";
    }
  }
}

module.exports = {
  ViewProvider
};
