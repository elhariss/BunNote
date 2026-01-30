const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * Editor Provider for opening markdown files in VS Code's main editor area
 * VS Codeのメインエディタエリアでマークダウンファイルを開くためのエディタープロバイダー
 */
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
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "src", "webview"))
      ]
    };

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
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
      } else if (msg.command === "ready") {
        webviewPanel.webview.postMessage({
          command: "initialize",
          content: document.getText(),
          fileName: path.basename(document.uri.fsPath)
        });
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  getHtml(webview) {
    const htmlPath = path.join(this.context.extensionPath, "src", "webview", "index.html");
    const cssPath = path.join(this.context.extensionPath, "src", "webview", "css", "style.css");
    const editorCssPath = path.join(this.context.extensionPath, "src", "webview", "css", "editor.css");
    const utilsPath = path.join(this.context.extensionPath, "src", "webview", "utils", "utlis.js");
    const filesPath = path.join(this.context.extensionPath, "src", "webview", "utils", "files.js");
    const editorPath = path.join(this.context.extensionPath, "src", "webview", "core", "editor.js");
    const tabsPath = path.join(this.context.extensionPath, "src", "webview", "UI", "tabs.js");
    const eventsPath = path.join(this.context.extensionPath, "src", "webview", "handlers", "events.js");
    const mainPath = path.join(this.context.extensionPath, "src", "webview", "core", "main.js");

    const toWebviewUri = (filePath) =>
      webview.asWebviewUri(vscode.Uri.file(filePath)).toString();

    const cssUri = toWebviewUri(cssPath);
    const editorCssUri = toWebviewUri(editorCssPath);
    const utilsUri = toWebviewUri(utilsPath);
    const filesUri = toWebviewUri(filesPath);
    const editorUri = toWebviewUri(editorPath);
    const tabsUri = toWebviewUri(tabsPath);
    const eventsUri = toWebviewUri(eventsPath);
    const mainUri = toWebviewUri(mainPath);

    try {
      let html = fs.readFileSync(htmlPath, "utf8");
      html = html
        .replace("{{CSS_URI}}", cssUri)
        .replace("{{EDITOR_CSS_URI}}", editorCssUri)
        .replace("{{UTILS_URI}}", utilsUri)
        .replace("{{FILES_URI}}", filesUri)
        .replace("{{EDITOR_URI}}", editorUri)
        .replace("{{TABS_URI}}", tabsUri)
        .replace("{{EVENTS_URI}}", eventsUri)
        .replace("{{MAIN_URI}}", mainUri);

      html = html.replace(
        '<body class="loading">',
        '<body class="loading" data-editor-mode="custom">'
      );

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
