import { 
  GetTreeData, 
  ToggleFolderExpanded, 
  AddFolder as WailsAddFolder,
  AddHost as WailsAddHost,
  UpdateFolder as WailsUpdateFolder,
  DeleteFolder as WailsDeleteFolder,
  UpdateHost as WailsUpdateHost,
  DeleteHost as WailsDeleteHost,
  MoveItem as WailsMoveItem,
  ToggleAllFoldersExpanded as WailsToggleAllFoldersExpanded
} from '../../wailsjs/go/main/App';
import { db } from '../../wailsjs/go/models';
import { TreeNode } from '../components/ui/TreeView';
import { IconName } from '../components/ui/Icon';

/**
 * Service to manage host data from the backend.
 */
export const HostsService = {
  /**
   * Fetches the full tree data and returns it as a TreeNode structure.
   */
  async getHostsTree(): Promise<TreeNode[]> {
    try {
      const data = await GetTreeData();
      if (!data) return [];
      
      return this.buildTree(data);
    } catch (err) {
      console.error('Failed to fetch tree data:', err);
      return [];
    }
  },

  /**
   * Persists the expanded state of a folder.
   */
  async toggleFolder(folderId: string, expanded: boolean): Promise<void> {
    const id = this.parseId(folderId);
    if (id === undefined) return;
    
    try {
      await ToggleFolderExpanded(id, expanded);
    } catch (err) {
      console.error('Failed to toggle folder state:', err);
    }
  },

  /**
   * Persists the expanded state of all folders.
   */
  async toggleAllFolders(expanded: boolean): Promise<void> {
    try {
      await WailsToggleAllFoldersExpanded(expanded);
    } catch (err) {
      console.error('Failed to toggle all folders state:', err);
    }
  },

  async addFolder(label: string, parentId?: string): Promise<number> {
    const f = new db.Folder({
      label,
      parentId: parentId ? this.parseId(parentId) : undefined,
      icon: 'folder',
      isExpanded: false,
      sortOrder: 0
    });
    return WailsAddFolder(f);
  },

  async updateFolder(folderId: string, label: string): Promise<void> {
    const id = this.parseId(folderId);
    if (id === undefined) return;
    const f = new db.Folder({
      id,
      label,
      icon: 'folder',
    });
    return WailsUpdateFolder(f);
  },

  async deleteFolder(folderId: string): Promise<void> {
    const id = this.parseId(folderId);
    if (id === undefined) return;
    return WailsDeleteFolder(id);
  },

  async addHost(host: Partial<db.Host>): Promise<number> {
    const h = new db.Host(host);
    return WailsAddHost(h);
  },

  async updateHost(host: db.Host): Promise<void> {
    return WailsUpdateHost(host);
  },

  async deleteHost(hostId: string): Promise<void> {
    const id = this.parseId(hostId);
    if (id === undefined) return;
    return WailsDeleteHost(id);
  },

  async moveItem(itemType: 'folder' | 'host', id: string, targetFolderId: string | null, sortOrder: number): Promise<void> {
    const numericId = this.parseId(id);
    const numericTargetId = targetFolderId ? (this.parseId(targetFolderId) || 0) : 0;
    
    if (numericId === undefined) return;
    
    return WailsMoveItem(itemType, numericId, numericTargetId, sortOrder);
  },

  parseId(stringId: string): number | undefined {
    const id = parseInt(stringId.replace('f-', '').replace('h-', ''));
    return isNaN(id) ? undefined : id;
  },

  /**
   * Extracts a map of folder IDs that are marked as expanded.
   */
  getExpandedMap(nodes: TreeNode[]): Record<string, boolean> {
    let map: Record<string, boolean> = {};
    for (const node of nodes) {
      if (node.data?.isExpanded) {
        map[node.id] = true;
      }
      if (node.children && node.children.length > 0) {
        map = { ...map, ...this.getExpandedMap(node.children) };
      }
    }
    return map;
  },

  /**
   * Transforms TreeData (Folders + Hosts) into a recursive TreeNode structure.
   */
  buildTree(data: db.TreeData): TreeNode[] {
    const nodesMap: Record<string, TreeNode> = {};
    const rootNodes: TreeNode[] = [];

    // 1. Process Folders
    data.folders.forEach((f) => {
      const id = `f-${f.id}`;
      nodesMap[id] = {
        id,
        label: f.label,
        icon: (f.icon as IconName) || 'folder',
        children: [],
        data: {
          ...f,
          isFolder: true,
        }
      };
    });

    // 2. Process Hosts
    data.hosts.forEach((h) => {
      const id = `h-${h.id}`;
      nodesMap[id] = {
        id,
        label: h.label,
        icon: (h.icon as IconName) || 'server',
        data: {
          ...h,
          isFolder: false,
        }
      };
    });

    // 3. Connect Folders to Parent Folders
    data.folders.forEach((f) => {
      const id = `f-${f.id}`;
      const node = nodesMap[id];
      if (f.parentId) {
        const parentId = `f-${f.parentId}`;
        const parent = nodesMap[parentId];
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // 4. Connect Hosts to Folders
    data.hosts.forEach((h) => {
      const id = `h-${h.id}`;
      const node = nodesMap[id];
      if (h.folderId) {
        const folderId = `f-${h.folderId}`;
        const parentFolder = nodesMap[folderId];
        if (parentFolder && parentFolder.children) {
          parentFolder.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // 5. Final Sorting: ensure folders and hosts are mixed based on sortOrder
    const sortByOrder = (a: TreeNode, b: TreeNode) => {
      const orderA = a.data?.sortOrder ?? 0;
      const orderB = b.data?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label);
    };

    Object.values(nodesMap).forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.sort(sortByOrder);
      }
    });

    rootNodes.sort(sortByOrder);
    
    return rootNodes;
  }
};
