# SF Profile Editor

A VS Code extension that provides a tree view of Salesforce Profile XML files, allowing you to easily navigate and explore profile structures.

## Features

- **Profile Tree View**: Displays all `*profile-meta.xml` files in your workspace
- **Structured Navigation**: Groups profile elements by their XML tags (e.g., `layoutAssignments`, `fieldPermissions`, `objectPermissions`)
- **Hierarchical Layout Assignment Structure**: Layout assignments are organized in a 4-level hierarchy:
  - Level 1: `layoutAssignments` (all layout assignments)
  - Level 2: Object (e.g., `Account`, `Contact`)
  - Level 3: Record Type (e.g., `Master`, `Account.Customer`, `Contact.Customer`)
  - Level 4: Individual Layout (e.g., `Account-Account Layout`, `Account-Customer Account Layout`)
- **Detailed Tooltips**: Hover over items to see additional attributes (e.g., `readable: true`, `editable: false` for field permissions)
- **Quick Access**: Click on any profile or item to open the corresponding XML file
- **Real-time Updates**: Automatically detects and loads profile files from your workspace

## Usage

1. Open a workspace containing Salesforce profile files (`*profile-meta.xml`)
2. The Profile Editor panel will appear in the activity bar (look for the profile icon)
3. Click on the Profile Editor icon to open the tree view
4. Navigate through:
   - **Profile Files**: Top-level items representing each profile
   - **Tag Groups**: Grouped XML elements (e.g., `layoutAssignments`, `fieldPermissions`)
   - **Individual Items**: Specific profile settings and permissions

## Commands

- **Reload Profiles**: Refresh the profile list (available in the tree view title bar)
- **Open Profile**: Open the full profile XML file
- **Open Profile Item**: Open the profile file and navigate to the specific item

## File Structure

The extension looks for profile files using the pattern `**/*profile-meta.xml` and excludes `node_modules` directories.

## Requirements

- VS Code 1.99.0 or higher
- Workspace with Salesforce profile XML files

## Development

To run the extension in development mode:

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 in VS Code to launch the extension in a new window

## Sample Profile Structure

The extension will display profiles in a tree structure like this:

```
📁 Admin
  📁 applicationVisibilities (2 items)
    📄 standard__Sales
    📄 standard__Service
  📁 classAccesses (2 items)
    📄 TestClass
    📄 UtilityClass
  📁 fieldPermissions (2 items)
    📄 Account.Name (hover to see: readable: true, editable: true)
    📄 Contact.Email (hover to see: readable: true, editable: true)
  📁 layoutAssignments (5 items)
    📁 Account (3 items)
      📁 Master (1 items)
        📄 Account-Account Layout
      📁 Account.Customer (1 items)
        📄 Account-Customer Account Layout
      📁 Account.Partner (1 items)
        📄 Account-Partner Account Layout
    📁 Contact (2 items)
      📁 Master (1 items)
        📄 Contact-Contact Layout
      📁 Contact.Customer (1 items)
        📄 Contact-Customer Contact Layout
  📁 objectPermissions (2 items)
    📄 Account (hover to see: allowCreate: true, allowDelete: true, allowEdit: true, allowRead: true)
    📄 Contact (hover to see: allowCreate: true, allowDelete: true, allowEdit: true, allowRead: true)
  📁 tabVisibilities (2 items)
    📄 standard-Account
    📄 standard-Contact
  📁 userPermissions (2 items)
    📄 ViewSetup (hover to see: enabled: true)
    📄 ModifyAllData (hover to see: enabled: true)

📁 Standard User
  📁 applicationVisibilities (1 items)
    📄 standard__Sales
  📁 classAccesses (1 items)
    📄 UtilityClass
  📁 fieldPermissions (2 items)
    📄 Account.Name (hover to see: readable: true, editable: false)
    📄 Contact.Email (hover to see: readable: true, editable: true)
  📁 layoutAssignments (2 items)
    📁 Contact (2 items)
      📁 Master (1 items)
        📄 Contact-Contact Layout
      📁 Contact.Customer (1 items)
        📄 Contact-Customer Contact Layout
  📁 objectPermissions (2 items)
    📄 Account (hover to see: allowCreate: false, allowDelete: false, allowEdit: false, allowRead: true)
    📄 Contact (hover to see: allowCreate: true, allowDelete: false, allowEdit: true, allowRead: true)
  📁 tabVisibilities (1 items)
    📄 standard-Contact
  📁 userPermissions (2 items)
    📄 ViewSetup (hover to see: enabled: false)
    📄 ModifyAllData (hover to see: enabled: false)
```

## Contributing

Feel free to submit issues and enhancement requests!
