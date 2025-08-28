import * as vscode from 'vscode';
import * as path from 'path';

export class ProfileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'profile' | 'profile-item' | 'profile-group',
    public readonly filePath?: string,
    public readonly tagName?: string,
    public readonly itemCount?: number,
    public readonly context?: { objectName?: string; recordTypeName?: string }
  ) {
    super(label, collapsibleState);

    this.contextValue = type;
    
    // Set appropriate icons based on type
    if (type === 'profile') {
      this.iconPath = new vscode.ThemeIcon('file');
      this.tooltip = `Profile: ${label}`;
    } else if (type === 'profile-group') {
      this.iconPath = new vscode.ThemeIcon('symbol-folder');
      this.tooltip = `${label} (${itemCount} items)`;
    } else if (type === 'profile-item') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      this.tooltip = `${tagName}: ${label}`;
    }

    // Set command for opening files
    if (filePath) {
      this.command = {
        command: type === 'profile' ? 'profile.open' : 'profile-item.open',
        title: 'Open',
        arguments: [this]
      };
    }
  }
}



