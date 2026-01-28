const vscode = require('vscode');
const { ViewProvider } = require("./extension/view");

function activate(context) {
    const provider = new ViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('bunNoteView', provider)
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
