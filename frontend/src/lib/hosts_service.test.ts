import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HostsService } from './hosts_service';
import * as WailsApp from '../../wailsjs/go/main/App';

vi.mock('../../wailsjs/go/main/App', () => ({
  GetTreeData: vi.fn(),
  AddFolder: vi.fn(),
  AddHost: vi.fn(),
  ToggleFolderExpanded: vi.fn(),
  UpdateFolder: vi.fn(),
  DeleteFolder: vi.fn(),
  UpdateHost: vi.fn(),
  DeleteHost: vi.fn(),
}));

describe('HostsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse IDs correctly', () => {
    expect(HostsService.parseId('f-123')).toBe(123);
    expect(HostsService.parseId('h-456')).toBe(456);
    expect(HostsService.parseId('invalid')).toBe(undefined);
  });

  it('should call Wails AddFolder', async () => {
    await HostsService.addFolder('New Folder');
    expect(WailsApp.AddFolder).toHaveBeenCalled();
  });

  it('should call Wails DeleteHost with parsed ID', async () => {
    await HostsService.deleteHost('h-99');
    expect(WailsApp.DeleteHost).toHaveBeenCalledWith(99);
  });

  it('should build a tree structure from flat data', () => {
    const mockData = {
      folders: [
        { id: 1, parentId: null, label: 'Root', icon: '', isExpanded: false, sortOrder: 0 }
      ],
      hosts: [
        { id: 1, folderId: 1, label: 'Host 1', icon: '', address: '1.1.1.1', type: 'ssh', port: 22, sortOrder: 0 }
      ]
    };

    const tree = HostsService.buildTree(mockData as any);
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('Root');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].label).toBe('Host 1');
  });
});
