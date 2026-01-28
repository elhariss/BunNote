const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class ViewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "src", "webview"))
      ]
    };
    view.webview.html = this.getHtml();

    view.webview.onDidReceiveMessage(async (msg) => {
      const vaultPath = this.getVaultPath();

      if (msg.command === "getFiles") {
        const entries = await this.getFiles();
        view.webview.postMessage({
          command: "files",
          files: entries.files,
          folders: entries.folders
        });
      } else if (msg.command === "openFile") {
        // Handle open file
      }
    });
  }

  getVaultPath() {
    return vscode.workspace.getConfiguration("bunnote").get("vaultPath");
  }

  async getFiles() {
    const vaultPath = this.getVaultPath();
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { files: [], folders: [] };
    }

    const files = [];
    const folders = [];

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
            await walkDir(fullPath);
          } else if (item.isFile() && item.name.endsWith(".md")) {
            const relativePath = path.relative(vaultPath, fullPath).split(path.sep).join("/");
            files.push({
              name: item.name,
              path: relativePath,
              fullPath: fullPath
            });
          }
        }
      } catch (err) {
        console.error("Error reading directory:", err);
      }
    };

    await walkDir(vaultPath);
    return {
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
      folders: folders.sort((a, b) => a.localeCompare(b))
    };
  }

  getHtml() {
    const htmlPath = path.join(this.context.extensionPath, "src", "webview", "index.html");
    const cssPath = path.join(this.context.extensionPath, "src", "webview", "style.css");
    const utilsPath = path.join(this.context.extensionPath, "src", "webview", "utils", "utlis.js");
    const filesPath = path.join(this.context.extensionPath, "src", "webview", "utils", "files.js");
    
    const toWebviewUri = (filePath) =>
    this.view ? this.view.webview.asWebviewUri(vscode.Uri.file(filePath)).toString() : "";
    
    const cssUri = toWebviewUri(cssPath);
    const utilsUri = toWebviewUri(utilsPath);
    const filesUri = toWebviewUri(filesPath);

    try {
      const html = fs.readFileSync(htmlPath, "utf8");
      return html
        .replace("{{CSS_URI}}", cssUri)
        .replace("{{UTILS_URI}}", utilsUri)
        .replace("{{FILES_URI}}", filesUri)
    } catch (err) {
      console.error("Failed to load webview HTML:", err);
      return "<html><body><h3>Failed to load BunNote.</h3></body></html>";
    }
  }
}

module.exports = {
  ViewProvider
};
