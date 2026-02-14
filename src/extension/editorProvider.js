const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class EditorProvider {
  constructor(context) {
    this.context = context;
  }

  static register(context) {
    const provider = new EditorProvider(context);
    const registration = vscode.window.registerCustomEditorProvider(
      "bunnote.markdownEditor",
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return registration;
  }

  async resolveCustomTextEditor(document, webviewPanel, _token) {
    const webviewRoot = vscode.Uri.file(path.join(this.context.extensionPath, "src", "webview"));
    const docDir = vscode.Uri.file(path.dirname(document.uri.fsPath));
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const roots = [webviewRoot, docDir];
    if (workspaceFolder) {
      roots.push(workspaceFolder.uri);
    }
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: roots
    };

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const docSub = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          command: "updateContent",
          content: document.getText()
        });
      }
    });

    webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === "saveContent") {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          msg.content
        );
        await vscode.workspace.applyEdit(edit);
      } else if (msg.command === "showMessage") {
        const message = msg.message || "Operation completed";
        if (msg.type === "error") {
          vscode.window.showErrorMessage(message);
        } else if (msg.type === "warning") {
          vscode.window.showWarningMessage(message);
        } else {
          vscode.window.showInformationMessage(message);
        }
      } else if (msg.command === "resolveImage") {
        const requestId = msg.requestId;
        const imagePath = typeof msg.imagePath === 'string' ? msg.imagePath.trim() : '';

        const respond = (uri) => webviewPanel.webview.postMessage({
          command: "resolvedImage",
          requestId,
          uri: uri || null
        });

        if (!requestId || !imagePath) {
          respond(null);
          return;
        }

        const isRemote = /^(https?:|data:|vscode-resource:|vscode-webview-resource:)/i.test(imagePath);
        if (isRemote) {
          respond(imagePath);
          return;
        }

        const cleanedPath = imagePath.replace(/^file:\/*/i, '').replace(/\\/g, '/');
        const baseDir = path.dirname(document.uri.fsPath);
        const resolvedPath = path.isAbsolute(cleanedPath)
          ? cleanedPath
          : path.resolve(baseDir, cleanedPath);

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const allowedRoot = workspaceFolder ? workspaceFolder.uri.fsPath : baseDir;
        const normalizedRoot = path.resolve(allowedRoot);
        const normalizedTarget = path.resolve(resolvedPath);
        const relative = path.relative(normalizedRoot, normalizedTarget);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          respond(null);
          return;
        }

        if (!fs.existsSync(normalizedTarget)) {
          respond(null);
          return;
        }

        const uri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(normalizedTarget)).toString();
        respond(uri);
      } else if (msg.command === "ready") {
        webviewPanel.webview.postMessage({
          command: "initialize",
          content: document.getText(),
          fileName: path.basename(document.uri.fsPath),
          filePath: document.uri.fsPath
        });
      }
    });

    webviewPanel.onDidDispose(() => {
      docSub.dispose();
    });
  }

  getHtml(webview) {
    const { getAllTranslations, getLocale } = require("../locales/i18n");
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
      webview.asWebviewUri(vscode.Uri.file(filePath)).toString();

    const cssUri = toWebviewUri(cssPath);
    const editorCssUri = toWebviewUri(editorCssPath);
    const utilsUri = toWebviewUri(utilsPath);
    const editorUri = toWebviewUri(editorPath);
    const fileManagerUri = toWebviewUri(fileManagerPath);
    const eventsUri = toWebviewUri(eventsPath);
    const mainUri = toWebviewUri(mainPath);

    const translations = getAllTranslations();
    const locale = getLocale();
    
    const translationsJson = JSON.stringify(translations)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/'/g, '\\u0027');

    try {
      let html = fs.readFileSync(htmlPath, "utf8");
      html = html
        .replace("{{CSS_URI}}", cssUri)
        .replace("{{EDITOR_CSS_URI}}", editorCssUri)
        .replace("{{UTILS_URI}}", utilsUri)
        .replace("{{EDITOR_URI}}", editorUri)
        .replace("{{FILE_MANAGER_URI}}", fileManagerUri)
        .replace("{{EVENTS_URI}}", eventsUri)
        .replace("{{MAIN_URI}}", mainUri)
        .replace("{{EDITOR_MODE}}", "main")
        .replace("{{MARKER_COLOR_MODE}}", markerColorMode)
        .replace("{{EDITOR_FONT_SIZE}}", String(editorFontSize))
        .replace("{{TRANSLATIONS}}", translationsJson)
        .replace("{{LOCALE}}", locale);

      return html;
    } catch (err) {
      console.error("Failed to load custom editor HTML:", err);
      return "<html><body><h3>Failed to load BunNote editor.</h3></body></html>";
    }
  }
}

module.exports = {
  EditorProvider
};
