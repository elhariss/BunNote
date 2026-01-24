const vscode = require("vscode");
const fs = require("fs");
const path = require("path");


class ViewProvider{
    constructor(context){
        this.context = context;
    }

    resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, "src", "webview"))
            ]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);
    }

    
    getHtml(webview) {
        const htmlPath = path.join(this.context.extensionPath, "src", "webview", "index.html");
        const cssPath = path.join(this.context.extensionPath, "src", "webview", "style.css");

        const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath)).toString();

        try {
            let html = fs.readFileSync(htmlPath, "utf8");
            return html.replace("{{CSS_URI}}", cssUri);
        } catch (err) {
            console.log("Failed to load webview HTML", err);
            return "<html><body><h3>Failed to load Obsidian view.</h3></body></html>";
        }
    }
}

module.exports = { ViewProvider }