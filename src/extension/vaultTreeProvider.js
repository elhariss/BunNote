const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { t } = require("../locales/i18n");

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

const isImageFile = (name) => {
    const ext = path.extname(name || "").toLowerCase();
    return imageExtensions.has(ext);
};

const isMarkdownFile = (name) => (name || "").toLowerCase().endsWith(".md");

const isAllowedDropFile = (name) => isMarkdownFile(name) || isImageFile(name);

/**
 * Generate unique file name by appending counter if file exists
 * ファイルが存在する場合はカウンタを追加して一意のファイル名を生成
 */
const getUniqueDestination = (dir, baseName) => {
    const ext = path.extname(baseName);
    const stem = path.basename(baseName, ext);
    let candidate = path.join(dir, baseName);
    let counter = 1;
    // Keep incrementing counter until we find an unused name
    // 未使用の名前が見つかるまでカウンタを増やし続ける
    while (fs.existsSync(candidate)) {
        const nextName = `${stem} (${counter})${ext}`;
        candidate = path.join(dir, nextName);
        counter += 1;
    }
    return candidate;
};

class VaultItem extends vscode.TreeItem {
    constructor({ label, uri, isFolder, isNote }) {
        super(label, isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.resourceUri = uri;
        this.contextValue = isFolder ? "bunnoteFolder" : "bunnoteFile";
        this.iconPath = isFolder
            ? new vscode.ThemeIcon("folder")
            : new vscode.ThemeIcon(isNote ? "note" : "file-media");

        if (!isFolder) {
            this.command = {
                command: "bunnote.openFile",
                title: "Open",
                arguments: [uri]
            };
        }
    }
}

class VaultTreeProvider {
    constructor(getVaultPath) {
        this.getVaultPath = getVaultPath;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.fileWatcher = null;
        this.setupWatcher();

        this.dragAndDropController = {
            dropMimeTypes: ["text/uri-list"],
            dragMimeTypes: ["text/uri-list"],
            handleDrag: (source, dataTransfer) => {
                const uris = source
                    .map(item => item.resourceUri)
                    .filter(Boolean)
                    .map(uri => uri.toString());
                if (!uris.length) {
                    return;
                }
                dataTransfer.set("text/uri-list", new vscode.DataTransferItem(uris.join("\n")));
            },
            handleDrop: async (target, dataTransfer) => {
                await this.handleDrop(target, dataTransfer);
            }
        };
    }

    refresh() {
        this._onDidChangeTreeData.fire();
        this.setupWatcher();
    }

    setupWatcher() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        const vaultPath = this.getVaultPath();
        if (vaultPath && fs.existsSync(vaultPath)) {
            const pattern = new vscode.RelativePattern(vaultPath, "**/*");
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
            this.fileWatcher.onDidCreate(() => this.refresh());
            this.fileWatcher.onDidDelete(() => this.refresh());
            this.fileWatcher.onDidChange(() => this.refresh());
        }
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        const vaultPath = this.getVaultPath();
        if (!vaultPath || !fs.existsSync(vaultPath)) {
            if (!element) {
                const item = new vscode.TreeItem(t("tree.setVaultToView"), vscode.TreeItemCollapsibleState.None);
                item.iconPath = new vscode.ThemeIcon("info");
                item.contextValue = "bunnoteInfo";
                return [item];
            }
            return [];
        }

        const dirPath = element && element.resourceUri ? element.resourceUri.fsPath : vaultPath;

        let entries = [];
        try {
            entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        } catch (err) {
            return [];
        }

        const folders = [];
        const files = [];

        for (const entry of entries) {
            if (entry.name.startsWith(".")) {
                continue;
            }

            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                folders.push(
                    new VaultItem({
                        label: entry.name,
                        uri: vscode.Uri.file(fullPath),
                        isFolder: true,
                        isNote: false
                    })
                );
            } else if (entry.isFile()) {
                const isMarkdown = entry.name.toLowerCase().endsWith(".md");
                const isImage = isImageFile(entry.name);
                if (!isMarkdown && !isImage) {
                    continue;
                }

                const label = isMarkdown ? entry.name.replace(/\.md$/i, "") : entry.name;
                files.push(
                    new VaultItem({
                        label,
                        uri: vscode.Uri.file(fullPath),
                        isFolder: false,
                        isNote: isMarkdown
                    })
                );
            }
        }

        folders.sort((a, b) => a.label.localeCompare(b.label));
        files.sort((a, b) => a.label.localeCompare(b.label));

        return [...folders, ...files];
    }

    /**
     * Handle drag and drop operations for files and folders
     * Security: validate paths are within vault, prevent self-drops
     * ファイルとフォルダのドラッグ&ドロップ操作を処理
     * セキュリティ：パスがvault内にあることを検証、自己ドロップを防止
     */
    async handleDrop(target, dataTransfer) {
        const vaultPath = this.getVaultPath();
        if (!vaultPath || !fs.existsSync(vaultPath)) {
            return;
        }

        const transferItem = dataTransfer.get("text/uri-list");
        if (!transferItem) {
            return;
        }

        let uriList = "";
        try {
            uriList = await transferItem.asString();
        } catch (err) {
            return;
        }

        const uris = uriList
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => vscode.Uri.parse(line));

        if (!uris.length) {
            return;
        }

        const targetPath = target && target.resourceUri ? target.resourceUri.fsPath : vaultPath;
        const isTargetFolder = target && target.contextValue === "bunnoteFolder";
        const targetDir = isTargetFolder ? targetPath : path.dirname(targetPath);

        const normalizedVault = path.resolve(vaultPath);

        for (const uri of uris) {
            const sourcePath = uri.fsPath;
            if (!sourcePath) {
                continue;
            }

            const normalizedSource = path.resolve(sourcePath);
            const relative = path.relative(normalizedVault, normalizedSource);
            const isInsideVault = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

            const baseName = path.basename(sourcePath);

            // Handle internal vault moves / vault内の移動を処理
            if (isInsideVault) {
                const destination = path.join(targetDir, baseName);
                const normalizedDestination = path.resolve(destination);

                // Prevent no-op moves / 無意味な移動を防止
                if (normalizedSource === normalizedDestination) {
                    continue;
                }

                // Prevent moving folder into itself / フォルダを自身の中に移動することを防止
                if (normalizedDestination.startsWith(normalizedSource + path.sep)) {
                    vscode.window.showErrorMessage(t("error.cannotMoveFolder"));
                    continue;
                }

                if (fs.existsSync(destination)) {
                    vscode.window.showErrorMessage(t("error.nameAlreadyExists"));
                    continue;
                }

                try {
                    fs.renameSync(sourcePath, destination);
                } catch (err) {
                    vscode.window.showErrorMessage(t("error.failedToMove", err.message));
                }
                continue;
            }

            // Handle external file imports / 外部ファイルのインポートを処理
            if (!isAllowedDropFile(baseName)) {
                vscode.window.showErrorMessage(t("error.onlyMarkdownOrImage"));
                continue;
            }

            let stat = null;
            try {
                stat = fs.statSync(sourcePath);
            } catch (err) {
                vscode.window.showErrorMessage(t("error.failedToAccess", err.message));
                continue;
            }

            if (!stat.isFile()) {
                vscode.window.showErrorMessage(t("error.onlyFiles"));
                continue;
            }

            // Copy external files with unique naming / 外部ファイルを一意の名前でコピー
            const destination = getUniqueDestination(targetDir, baseName);
            try {
                fs.copyFileSync(sourcePath, destination);
            } catch (err) {
                vscode.window.showErrorMessage(t("error.failedToCopy", err.message));
            }
        }

        this.refresh();
    }
}

module.exports = {
    VaultTreeProvider
};
