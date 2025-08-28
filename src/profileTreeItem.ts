import * as vscode from 'vscode';

export class ProfileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'profile' | 'profile-item' | 'profile-group' | 'layout-object-group' | 'layout-recordtype-group' | 'loading',
    public readonly filePath: string,
    public readonly profileName: string,
    public readonly tagName?: string,
    public readonly itemCount?: number,
    public readonly context?: { [key: string]: any }
  ) {
    super(label, collapsibleState);

    this.contextValue = type;
    this.tooltip = this.createTooltip();
    this.iconPath = this.getIcon();

    // Set command for opening files
    if (this.filePath && (this.type === 'profile' || this.type === 'profile-item')) {
      this.command = {
        command: this.type === 'profile' ? 'profile.open' : 'profile-item.open',
        title: 'Open',
        arguments: [this]
      };
    }
  }

  private createTooltip(): string {
    let tooltip = `Type: ${this.type}\nLabel: ${this.label}`;
    if (this.itemCount) {
        tooltip += ` (${this.itemCount} items)`;
    }
    if (this.tagName) {
        tooltip += `\nTag: ${this.tagName}`;
    }
    return tooltip;
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.type) {
      case 'profile':
        return new vscode.ThemeIcon('account');
      case 'profile-group':
      case 'layout-object-group':
      case 'layout-recordtype-group':
        return new vscode.ThemeIcon('symbol-folder');
      case 'profile-item':
        return new vscode.ThemeIcon('symbol-field');
      case 'loading':
        return new vscode.ThemeIcon('loading');
      default:
        return new vscode.ThemeIcon('symbol-misc');
    }
  }

  public getProfileName(): string {
    return this.profileName;
  }
}