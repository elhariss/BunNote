// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { ViewProvider } = require("./extension/view");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const provider = new ViewProvider(context, () => {
		return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
	})
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('bunNoteView', provider))

}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
