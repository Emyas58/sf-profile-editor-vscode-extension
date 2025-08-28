import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { ProfileTreeItem } from './profileTreeItem';

interface ProfileData {
  name: string;
  filePath: string;
  content: any;
  tagGroups: Map<string, any[]>;
}

export class ProfileListProvider implements vscode.TreeDataProvider<ProfileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProfileTreeItem | undefined | null> = 
    new vscode.EventEmitter<ProfileTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<ProfileTreeItem | undefined | null> = 
    this._onDidChangeTreeData.event;

  private profiles: ProfileData[] = [];
  private isLoading: boolean = true;
  private workspaceRoot: string | undefined;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async init(): Promise<void> {
    this.isLoading = true;
    this._onDidChangeTreeData.fire(undefined);
    await this.loadProfiles();
    this.isLoading = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  async reload(): Promise<void> {
    await this.loadProfiles();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ProfileTreeItem): ProfileTreeItem {
    return element;
  }

  public async editItem(item: ProfileTreeItem): Promise<void> {
    if (!item.filePath || !item.tagName) {
      vscode.window.showErrorMessage('Cannot edit this item. Missing file path or tag information.');
      return;
    }

    const editableAttributes: { [key: string]: string[] } = {
      fieldPermissions: ['editable', 'readable'],
      objectPermissions: ['allowCreate', 'allowDelete', 'allowEdit', 'allowRead', 'modifyAllRecords', 'viewAllRecords'],
      userPermissions: ['enabled'],
      layoutAssignments: ['layout', 'recordType']
    };

    const attributes = editableAttributes[item.tagName];
    if (!attributes) {
      vscode.window.showInformationMessage(`No editable attributes found for tag: ${item.tagName}`);
      return;
    }

    try {
      const attributeToEdit = await vscode.window.showQuickPick(attributes, {
        placeHolder: `Select attribute to edit for ${item.label}`
      });

      if (!attributeToEdit) {
        return; // User cancelled
      }

      // Read file and parse XML
      const xmlContent = fs.readFileSync(item.filePath, 'utf8');
      const parser = new xml2js.Parser({ explicitArray: true });
      const profileObject = await parser.parseStringPromise(xmlContent);

      const tagItems = profileObject.Profile[item.tagName];
      if (!tagItems || !Array.isArray(tagItems)) {
        throw new Error(`Could not find tag ${item.tagName} in profile.`);
      }

      // Find the specific item to edit
      const itemIdentifier = this.getItemIdentifier(item.tagName);
      const itemToEdit = tagItems.find(i => i[itemIdentifier] && i[itemIdentifier][0] === item.label);

      if (!itemToEdit) {
        throw new Error(`Could not find item '${item.label}' to edit in profile.`);
      }
      
      const currentValue = itemToEdit[attributeToEdit] ? itemToEdit[attributeToEdit][0] : '';
      let newValue: string | undefined;

      // Get new value from user
      const isBoolean = ['true', 'false'].includes(String(currentValue).toLowerCase()) || attributeToEdit === 'enabled' || attributeToEdit.startsWith('allow') || attributeToEdit.endsWith('Records');
      if (isBoolean) {
        newValue = await vscode.window.showQuickPick(['true', 'false'], {
          placeHolder: `Set value for ${attributeToEdit}`
        });
      } else {
        newValue = await vscode.window.showInputBox({
          prompt: `Enter new value for ${attributeToEdit}`,
          value: currentValue
        });
      }

      if (newValue === undefined || newValue === String(currentValue)) {
        return; // User cancelled or made no change
      }

      // Update the object
      itemToEdit[attributeToEdit] = [newValue];

      // Build XML and write back to file
      const builder = new xml2js.Builder();
      const newXmlContent = builder.buildObject(profileObject);
      fs.writeFileSync(item.filePath, newXmlContent);

      vscode.window.showInformationMessage(`Successfully updated '${item.label}'.`);
      await this.reload();

    } catch (error: any) {
      console.error(error);
      vscode.window.showErrorMessage(`Failed to edit item: ${error.message}`);
    }
  }

  async getChildren(element?: ProfileTreeItem): Promise<ProfileTreeItem[]> {
    if (!this.workspaceRoot) {
        return [];
    }

    if (!element) {
        // Root level: Show profiles
        if (this.isLoading) {
            const loadingItem = new ProfileTreeItem(
            "Loading profiles...",
            vscode.TreeItemCollapsibleState.None,
            'loading',
            '',
            ''
            );
            loadingItem.iconPath = new vscode.ThemeIcon("loading");
            return [loadingItem];
        }
        return this.profiles.map(profile => 
            new ProfileTreeItem(
            profile.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'profile',
            profile.filePath,
            profile.name
            )
        );
    }

    const profile = this.profiles.find(p => p.name === element.profileName);
    if (!profile) {
        return [];
    }

    if (element.type === 'profile') {
        return Array.from(profile.tagGroups.keys()).map(tagName => {
            const items = profile.tagGroups.get(tagName) || [];
            return new ProfileTreeItem(
                tagName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'profile-group',
                profile.filePath,
                profile.name,
                tagName,
                items.length
            );
        }).sort((a, b) => a.label.localeCompare(b.label));
    }

    if (element.type === 'profile-group' && element.tagName) {
        const items = profile.tagGroups.get(element.tagName) || [];
        if (element.tagName === 'layoutAssignments') {
            const objectGroups = this.groupLayoutAssignmentsByObject(items);
            return Array.from(objectGroups.keys()).map(objectName => {
                const objectItems = objectGroups.get(objectName) || [];
                return new ProfileTreeItem(
                    objectName,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'layout-object-group',
                    profile.filePath,
                    profile.name,
                    element.tagName,
                    objectItems.length
                );
            }).sort((a, b) => a.label.localeCompare(b.label));
        } else {
            return items.map(item => {
                const itemLabel = this.getItemLabel(item, element.tagName!);
                const treeItem = new ProfileTreeItem(
                    itemLabel,
                    vscode.TreeItemCollapsibleState.None,
                    'profile-item',
                    profile.filePath,
                    profile.name,
                    element.tagName
                );
                treeItem.tooltip = this.getItemTooltip(item, element.tagName!);
                return treeItem;
            });
        }
    }

    if (element.type === 'layout-object-group' && element.tagName === 'layoutAssignments') {
        const allLayouts = profile.tagGroups.get('layoutAssignments') || [];
        const objectLayouts = allLayouts.filter(l => this.getItemLabel(l, 'layoutAssignments').startsWith(element.label + '-'));
        const recordTypeGroups = this.groupLayoutAssignmentsByRecordType(objectLayouts);

        return Array.from(recordTypeGroups.keys()).map(recordTypeName => {
            const recordTypeItems = recordTypeGroups.get(recordTypeName) || [];
            return new ProfileTreeItem(
                recordTypeName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'layout-recordtype-group',
                profile.filePath,
                profile.name,
                element.tagName,
                recordTypeItems.length,
                { objectName: element.label }
            );
        }).sort((a, b) => a.label.localeCompare(b.label));
    }

    if (element.type === 'layout-recordtype-group' && element.tagName === 'layoutAssignments') {
        const objectName = element.context?.objectName;
        const recordTypeName = element.label;
        if (objectName) {
            const allLayouts = profile.tagGroups.get('layoutAssignments') || [];
            const objectLayouts = allLayouts.filter(l => this.getItemLabel(l, 'layoutAssignments').startsWith(objectName + '-'));
            const recordTypeLayouts = (this.groupLayoutAssignmentsByRecordType(objectLayouts).get(recordTypeName) || []);

            return recordTypeLayouts.map(item => {
                const itemLabel = this.getItemLabel(item, 'layoutAssignments');
                const treeItem = new ProfileTreeItem(
                    itemLabel,
                    vscode.TreeItemCollapsibleState.None,
                    'profile-item',
                    profile.filePath,
                    profile.name,
                    'layoutAssignments'
                );
                treeItem.tooltip = this.getItemTooltip(item, 'layoutAssignments');
                return treeItem;
            });
        }
    }

    return [];
  }

  private getItemIdentifier(tagName: string): string {
    const identifiers: { [key: string]: string } = {
        fieldPermissions: 'field',
        objectPermissions: 'object',
        userPermissions: 'name',
        classAccesses: 'apexClass',
        pageAccesses: 'apexPage',
        customPermissions: 'name',
        tabVisibilities: 'tab',
        applicationVisibilities: 'application',
        layoutAssignments: 'layout',
    };
    return identifiers[tagName] || 'name'; 
  }

  private getItemLabel(item: any, tagName: string): string {
    const identifier = this.getItemIdentifier(tagName);
    if (item[identifier] && item[identifier][0]) { 
        return item[identifier][0];
    }
    
    // Fallback for weird cases
    const keys = Object.keys(item);
    if (keys.length > 0 && item[keys[0]] && item[keys[0]][0]) {
      return `${keys[0]}: ${item[keys[0]][0]}`;
    }
    
    return 'Unknown item';
  }

  private getItemTooltip(item: any, tagName: string): string {
    const attributes: string[] = [];
    const identifier = this.getItemIdentifier(tagName);
    
    for (const [key, value] of Object.entries(item)) {
        if (key !== identifier && key !== 'fullName' && key !== '$') {
            if (Array.isArray(value) && value.length > 0 && value[0]) {
                 attributes.push(`${key}: ${value[0]}`);
            }
        }
    }
    
    if (attributes.length > 0) {
      return attributes.join('\n');
    }
    
    return '';
  }

  private groupLayoutAssignmentsByObject(items: any[]): Map<string, any[]> {
    const objectGroups = new Map<string, any[]>();
    
    for (const item of items) {
      const layoutName = (item.layout && item.layout[0]) || '';
      const objectName = layoutName.split('-')[0];
      
      if (objectName) {
        if (!objectGroups.has(objectName)) {
          objectGroups.set(objectName, []);
        }
        objectGroups.get(objectName)!.push(item);
      }
    }
    
    return objectGroups;
  }

  private groupLayoutAssignmentsByRecordType(items: any[]): Map<string, any[]> {
    const recordTypeGroups = new Map<string, any[]>();
    
    for (const item of items) {
      const recordType = (item.recordType && item.recordType[0]) || 'Master';
      
      if (!recordTypeGroups.has(recordType)) {
        recordTypeGroups.set(recordType, []);
      }
      recordTypeGroups.get(recordType)!.push(item);
    }
    
    return recordTypeGroups;
  }

  private async loadProfiles(): Promise<void> {
    if (!this.workspaceRoot) {
      this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!this.workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Loading Profile Files",
        cancellable: false
      },
      async () => {
        try {
          const profileFiles = await this.findProfileFiles();
          this.profiles = [];

          for (const filePath of profileFiles) {
            try {
              const profileData = await this.parseProfileFile(filePath);
              if (profileData) {
                this.profiles.push(profileData);
              }
            } catch (error: any) {
              console.error(`Error parsing profile file ${filePath}:`, error);
            }
          }

          // Sort profiles alphabetically
          this.profiles.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to load profiles: ${error.message}`);
        }
      }
    );
  }

  private async findProfileFiles(): Promise<string[]> {
    const pattern = '**/*profile-meta.xml';
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    return files.map(file => file.fsPath);
  }

  private async parseProfileFile(filePath: string): Promise<ProfileData | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser({ explicitArray: true });
      const result = await parser.parseStringPromise(content);

      if (!result.Profile) {
        return null;
      }

      const profileName = path.basename(filePath, '.profile-meta.xml');
      const tagGroups = new Map<string, any[]>();

      const profileContent = result.Profile;
      
      for (const [tagName, tagContent] of Object.entries(profileContent)) {
        if (tagName === '$' || tagName === 'fullName') {
          continue;
        }

        if (Array.isArray(tagContent)) {
          tagGroups.set(tagName, tagContent);
        }
      }

      return {
        name: profileName,
        filePath: filePath,
        content: result.Profile,
        tagGroups: tagGroups
      };
    } catch (error: any) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }
}