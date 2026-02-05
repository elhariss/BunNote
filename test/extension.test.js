
const assert = require('assert');
const vscode = require('vscode');

suite('BunNote Extension Test Suite', () => {
	test('Extension should be present', async () => {
		const ext = vscode.extensions.getExtension('elharis.bunnote');
		assert.ok(ext, 'Extension not found');
	});

	test('Extension activates', async () => {
		const ext = vscode.extensions.getExtension('elharis.bunnote');
		await ext.activate();
		assert.ok(ext.isActive, 'Extension did not activate');
	});

	test('BunNote: Set Vault Folder command is registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('bunnote.setVault'), 'bunnote.setVault command not found');
	});
});
