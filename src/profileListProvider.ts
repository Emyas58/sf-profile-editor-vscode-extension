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

  async getChildren(element?: ProfileTreeItem): Promise<ProfileTreeItem[]> {
    if (element) {
      if (element.type === 'profile') {
        // Return tag groups for this profile
        const profile = this.profiles.find(p => p.name === element.label);
        if (profile) {
          const groupItems: ProfileTreeItem[] = [];
          for (const [tagName, items] of profile.tagGroups.entries()) {
            // Special handling for layoutAssignments - group by object
            if (tagName === 'layoutAssignments') {
              const groupItem = new ProfileTreeItem(
                tagName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'profile-group',
                undefined,
                undefined,
                items.length
              );
              groupItems.push(groupItem);
            } else {
              const groupItem = new ProfileTreeItem(
                tagName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'profile-group',
                undefined,
                undefined,
                items.length
              );
              groupItems.push(groupItem);
            }
          }
          return groupItems.sort((a, b) => a.label.localeCompare(b.label));
        }
      } else if (element.type === 'profile-group') {
        // Return items for this tag group
        const profile = this.profiles.find(p => 
          p.tagGroups.has(element.label)
        );
        if (profile) {
          let items: any[] = [];
          const tagName = element.label;
          
          if (tagName === 'layoutAssignments') {
            // Return object groups for layout assignments
            const allLayoutItems = profile.tagGroups.get('layoutAssignments') || [];
            const objectGroups = this.groupLayoutAssignmentsByObject(allLayoutItems);
            
            return Array.from(objectGroups.keys()).map(objectName => {
              const objectItems = objectGroups.get(objectName) || [];
              return new ProfileTreeItem(
                objectName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'profile-group',
                undefined,
                'layoutAssignments',
                objectItems.length
              );
            }).sort((a, b) => a.label.localeCompare(b.label));
          } else {
            items = profile.tagGroups.get(tagName) || [];
          }
          
          return items.map(item => {
            const itemLabel = this.getItemLabel(item, tagName);
            const tooltip = this.getItemTooltip(item, tagName);
            const treeItem = new ProfileTreeItem(
              itemLabel,
              vscode.TreeItemCollapsibleState.None,
              'profile-item',
              profile.filePath,
              tagName
            );
            treeItem.tooltip = tooltip;
            return treeItem;
          });
        } else if (element.type === 'profile-group' && element.tagName === 'layoutAssignments' && !element.context?.recordTypeName) {
          // Handle object level - return record type groups
          console.log('DEBUG: Processing object level:', element.label);
          const profile = this.profiles.find(p => 
            p.tagGroups.has('layoutAssignments')
          );
          if (profile) {
            const allLayoutItems = profile.tagGroups.get('layoutAssignments') || [];
            const objectItems = allLayoutItems.filter(item => {
              const layoutName = item.layout || '';
              return layoutName.startsWith(element.label + '-');
            });
            
            console.log('DEBUG: Object items for', element.label, ':', objectItems);
            
            const recordTypeGroups = this.groupLayoutAssignmentsByRecordType(objectItems);
            
            console.log('DEBUG: Record type groups:', Array.from(recordTypeGroups.keys()));
            
            return Array.from(recordTypeGroups.keys()).map(recordTypeName => {
              const recordTypeItems = recordTypeGroups.get(recordTypeName) || [];
              const treeItem = new ProfileTreeItem(
                recordTypeName,
                vscode.TreeItemCollapsibleState.Collapsed,
                'profile-group',
                undefined,
                'layoutAssignments',
                recordTypeItems.length,
                { objectName: element.label, recordTypeName: recordTypeName }
              );
              console.log('DEBUG: Created record type item:', recordTypeName, 'with context:', treeItem.context);
              return treeItem;
            }).sort((a, b) => (a.label as string).localeCompare(b.label as string));
          }
        } else if (element.type === 'profile-group' && element.tagName === 'layoutAssignments' && element.context?.recordTypeName) {
          // Handle record type level - return layouts
          console.log('DEBUG: Processing record type level:', element.label, element.context);
          const profile = this.profiles.find(p => 
            p.tagGroups.has('layoutAssignments')
          );
          if (profile && element.context) {
            const allLayoutItems = profile.tagGroups.get('layoutAssignments') || [];
            const objectName = element.context.objectName || '';
            const recordTypeName = element.context.recordTypeName || '';
            
            console.log('DEBUG: Looking for layouts with object:', objectName, 'recordType:', recordTypeName);
            console.log('DEBUG: All layout items:', allLayoutItems);
            
            const recordTypeItems = allLayoutItems.filter(item => {
              const layoutName = item.layout || '';
              const itemRecordType = item.recordType || '';
              const matches = layoutName.startsWith(objectName + '-') && 
                     (itemRecordType === recordTypeName || (!itemRecordType && recordTypeName === 'Master'));
              console.log('DEBUG: Item:', item, 'matches:', matches);
              return matches;
            });
            
            console.log('DEBUG: Found record type items:', recordTypeItems);
            
            return recordTypeItems.map(item => {
              const itemLabel = this.getItemLabel(item, 'layoutAssignments');
              const tooltip = this.getItemTooltip(item, 'layoutAssignments');
              const treeItem = new ProfileTreeItem(
                itemLabel,
                vscode.TreeItemCollapsibleState.None,
                'profile-item',
                profile.filePath,
                'layoutAssignments'
              );
              treeItem.tooltip = tooltip;
              return treeItem;
            });
          }
        }
      }
      return [];
    } else {
      // Show loading state
      if (this.isLoading) {
        const loadingItem = new ProfileTreeItem(
          "Loading profiles...",
          vscode.TreeItemCollapsibleState.None,
          'profile-group'
        );
        loadingItem.iconPath = new vscode.ThemeIcon("loading");
        return [loadingItem];
      }

      // Return profile files
      return this.profiles.map(profile => 
        new ProfileTreeItem(
          profile.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          'profile',
          profile.filePath
        )
      );
    }
  }

  private getItemLabel(item: any, tagName: string): string {
    // Try to find a meaningful label for the item
    if (item.name) { return item.name; }
    if (item.fullName) { return item.fullName; }
    if (item.layout) { return item.layout; }
    if (item.object) { return item.object; }
    if (item.field) { return item.field; }
    if (item.recordType) { return item.recordType; }
    if (item.tab) { return item.tab; }
    if (item.application) { return item.application; }
    if (item.apexClass) { return item.apexClass; }
    if (item.apexPage) { return item.apexPage; }
    if (item.customPermission) { return item.customPermission; }
    if (item.externalDataSource) { return item.externalDataSource; }
    if (item.flow) { return item.flow; }
    if (item.connectedApp) { return item.connectedApp; }
    
    // Fallback to showing the first property
    const keys = Object.keys(item);
    if (keys.length > 0) {
      return `${keys[0]}: ${item[keys[0]]}`;
    }
    
    return 'Unknown item';
  }

  private getItemTooltip(item: any, tagName: string): string {
    const attributes: string[] = [];
    
    // Add all attributes to the tooltip
    for (const [key, value] of Object.entries(item)) {
      if (key !== 'layout' && key !== 'field' && key !== 'object' && key !== 'name' && key !== 'fullName') {
        attributes.push(`${key}: ${value}`);
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
      const layoutName = item.layout || '';
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
      const recordType = item.recordType || 'Master';
      
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
            } catch (error) {
              console.error(`Error parsing profile file ${filePath}:`, error);
            }
          }

          // Sort profiles alphabetically
          this.profiles.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to load profiles: ${error}`);
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
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(content);

      if (!result.Profile) {
        return null;
      }

      const profileName = path.basename(filePath, '-meta.xml');
      const tagGroups = new Map<string, any[]>();

      // Extract all tags inside the Profile element
      const profileContent = result.Profile;
      
      for (const [tagName, tagContent] of Object.entries(profileContent)) {
        if (tagName === '$' || tagName === 'fullName') {
          continue; // Skip metadata attributes
        }

        if (Array.isArray(tagContent)) {
          tagGroups.set(tagName, tagContent);
        } else if (tagContent && typeof tagContent === 'object') {
          tagGroups.set(tagName, [tagContent]);
        }
      }

      return {
        name: profileName,
        filePath: filePath,
        content: result.Profile,
        tagGroups: tagGroups
      };
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }
}
