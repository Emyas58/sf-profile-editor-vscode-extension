import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProfileListProvider } from '../profileListProvider';
import { ProfileTreeItem } from '../profileTreeItem';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('ProfileTreeItem creation', () => {
		const item = new ProfileTreeItem(
			'Test Profile',
			vscode.TreeItemCollapsibleState.Collapsed,
			'profile',
			'/test/path/profile.xml',
      'Test Profile'
		);
		
		assert.strictEqual(item.label, 'Test Profile');
		assert.strictEqual(item.type, 'profile');
		assert.strictEqual(item.contextValue, 'profile');
	});

	test('ProfileListProvider initialization', () => {
		const provider = new ProfileListProvider('/test/workspace');
		assert.ok(provider);
	});

	test('ProfileTreeItem types', () => {
		const profileItem = new ProfileTreeItem(
			'Admin',
			vscode.TreeItemCollapsibleState.Collapsed,
			'profile',
			'/test/path/Admin.profile-meta.xml',
      'Admin'
		);
		
		const groupItem = new ProfileTreeItem(
			'layoutAssignments',
			vscode.TreeItemCollapsibleState.Collapsed,
			'profile-group',
			'/test/path/Admin.profile-meta.xml',
      'Admin',
			'layoutAssignments',
			5
		);
		
		const itemElement = new ProfileTreeItem(
			'Account-Account Layout',
			vscode.TreeItemCollapsibleState.None,
			'profile-item',
			'/test/path/Admin.profile-meta.xml',
      'Admin',
			'layoutAssignments',
      undefined
		);
		
		assert.strictEqual(profileItem.type, 'profile');
		assert.strictEqual(groupItem.type, 'profile-group');
		assert.strictEqual(itemElement.type, 'profile-item');
	});

	test('Layout assignment object grouping', () => {
		const provider = new ProfileListProvider('/test/workspace');
		const items = [
			{ layout: ['Account-Account Layout'] },
			{ layout: ['Account-Contact Layout'] },
			{ layout: ['Contact-Contact Layout'] }
		];
		
		// Access the private method for testing
		const groupLayoutAssignmentsByObject = (provider as any).groupLayoutAssignmentsByObject.bind(provider);
		const result = groupLayoutAssignmentsByObject(items);
		
		assert.strictEqual(result.size, 2); // Account and Contact
		assert.strictEqual(result.get('Account')?.length, 2);
		assert.strictEqual(result.get('Contact')?.length, 1);
	});

	test('Tooltip generation', () => {
		const provider = new ProfileListProvider('/test/workspace');
		const fieldPermission = {
			field: ['Account.Name'],
			readable: ['true'],
			editable: ['false']
		};
		
		// Access the private method for testing
		const getItemTooltip = (provider as any).getItemTooltip.bind(provider);
		const tooltip = getItemTooltip(fieldPermission, 'fieldPermissions');
		
		assert.ok(tooltip.includes('readable: true'));
		assert.ok(tooltip.includes('editable: false'));
		assert.ok(!tooltip.includes('field: Account.Name'));
	});

	test('Layout assignment record type grouping', () => {
		const provider = new ProfileListProvider('/test/workspace');
		const items = [
			{ layout: ['Account-Account Layout'] },
			{ layout: ['Account-Customer Layout'], recordType: ['Account.Customer'] },
			{ layout: ['Account-Partner Layout'], recordType: ['Account.Partner'] }
		];
		
		// Access the private method for testing
		const groupLayoutAssignmentsByRecordType = (provider as any).groupLayoutAssignmentsByRecordType.bind(provider);
		const result = groupLayoutAssignmentsByRecordType(items);
		
		assert.strictEqual(result.size, 3); // Master, Account.Customer, Account.Partner
		assert.strictEqual(result.get('Master')?.length, 1);
		assert.strictEqual(result.get('Account.Customer')?.length, 1);
		assert.strictEqual(result.get('Account.Partner')?.length, 1);
	});
});