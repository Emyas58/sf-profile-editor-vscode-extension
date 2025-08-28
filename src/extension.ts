// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ProfileListProvider } from './profileListProvider';
import { ProfileTreeItem } from './profileTreeItem';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const profileListProvider = new ProfileListProvider(workspaceRoot);
  
  // Register the tree data provider immediately so the view is available
  vscode.window.registerTreeDataProvider("profile-list", profileListProvider);
  
  // Register commands immediately
  context.subscriptions.push(
    vscode.commands.registerCommand("profile-list.reload", () =>
      profileListProvider.reload()
    ),
    vscode.commands.registerCommand("profile.open", (profile: ProfileTreeItem) => {
      if (profile.filePath) {
        vscode.workspace.openTextDocument(profile.filePath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    }),
    vscode.commands.registerCommand("profile-item.open", (item: ProfileTreeItem) => {
      if (item.filePath) {
        vscode.workspace.openTextDocument(item.filePath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    })
  );
  
  // Load the profile list immediately when VS Code starts
  // Use setTimeout to ensure VS Code is fully initialized
  setTimeout(() => {
    profileListProvider.init().catch((error) => {
      vscode.window.showErrorMessage(`Failed to load profiles: ${error.message}`);
    });
  }, 100);
}

export function deactivate(): void {
  // Cleanup code if needed
}
