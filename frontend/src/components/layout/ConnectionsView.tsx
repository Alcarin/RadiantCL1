import React, { useState, useCallback, useRef, useMemo } from 'react';
import { SideBarSection } from './SideBarSection';
import { TreeView, TreeNode, TreeViewHandle } from '../ui/TreeView';
import { IconName } from '../ui/Icon';
import { mockConnections as initialMockConnections } from '../../lib/mockData';
import { HostsService } from '../../lib/hosts_service';
import { HostFormModal } from './modals/HostFormModal';
import { FolderFormModal } from './modals/FolderFormModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { db } from '../../../wailsjs/go/models';
import { getDndManager } from '../../lib/dnd';

interface ActionButtonProps {
  icon: IconName;
  title: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="p-1 rounded text-rd-text hover:text-rd-text-active hover:bg-white/10 transition-colors"
    title={title}
  >
    {/* Explicitly using a span or div if Icon is not available, but Icon is imported in TreeView */}
    {/* Actually I should import Icon here too if I use it */}
    <span className="flex items-center justify-center">
      {/* Reusing the Icon component would be better */}
      <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Simple placeholder or import Icon */}
      </svg>
    </span>
  </button>
  // Note: I will use the actual Icon component by importing it properly
);

// Corrected ActionButton to use the actual Icon component
import { Icon } from '../ui/Icon';

const ActionButtonProper: React.FC<ActionButtonProps> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    className="p-1 rounded text-rd-text hover:text-rd-text-active hover:bg-white/10 transition-colors"
    title={title}
  >
    <Icon name={icon} size={14} />
  </button>
);

export const ConnectionsView: React.FC = () => {
  const [selectedHostId, setSelectedHostId] = useState<string | undefined>();
  const [hosts, setHosts] = useState<TreeNode[]>([]);
  const [activeConnections, setActiveConnections] = useState(initialMockConnections);
  const [isLoading, setIsLoading] = useState(true);
  
  // Shared DND Manager singleton
  const dndManager = getDndManager();

  
  const savedHostsTreeRef = useRef<TreeViewHandle>(null);
  const activeConnectionsTreeRef = useRef<TreeViewHandle>(null);

  const loadHosts = useCallback(async () => {
    if (hosts.length === 0) setIsLoading(true);
    const tree = await HostsService.getHostsTree();
    setHosts(tree);
    setIsLoading(false);
  }, [hosts.length]);

  React.useEffect(() => {
    loadHosts();
  }, []); // Only call loadHosts once on mount

  const initialOpenState = useMemo(() => {
    return HostsService.getExpandedMap(hosts);
  }, [hosts]); // Recalculate when hosts change, though Arborist only uses it once

  const collapseAll = useCallback(() => {
    savedHostsTreeRef.current?.tree?.closeAll();
  }, []);

  const expandAll = useCallback(() => {
    savedHostsTreeRef.current?.tree?.openAll();
  }, []);

  const handleSaveHost = async (hostData: Partial<db.Host>) => {
    if (modalState.isEdit && modalState.node) {
      const id = HostsService.parseId(modalState.node.id);
      if (id !== undefined) {
        await HostsService.updateHost(new db.Host({ ...hostData, id }));
      }
    } else {
      let folderId = selectedHostId?.startsWith('f-') ? HostsService.parseId(selectedHostId) : undefined;
      await HostsService.addHost({ ...hostData, folderId });
    }
    loadHosts();
  };

  const handleSaveFolder = async (label: string) => {
    if (modalState.isEdit && modalState.node) {
      await HostsService.updateFolder(modalState.node.id, label);
    } else {
      let parentId = selectedHostId?.startsWith('f-') ? selectedHostId : undefined;
      await HostsService.addFolder(label, parentId);
    }
    loadHosts();
  };

  const handleDeleteConfirm = async () => {
    if (!modalState.node) return;
    if (modalState.node.id.startsWith('f-')) await HostsService.deleteFolder(modalState.node.id);
    else await HostsService.deleteHost(modalState.node.id);
    if (selectedHostId === modalState.node.id) setSelectedHostId(undefined);
    setModalState({ type: null, isEdit: false });
    loadHosts();
  };

  // MAPPING: Active Connections to TreeNode
  const mappedActiveConnections = useMemo(() => {
    return activeConnections.map(c => ({
      id: c.id,
      label: c.name,
      icon: 'network' as IconName,
      data: { ...c, label: c.name, icon: 'network' }
    }));
  }, [activeConnections]);

  const handleMoveActive = ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    // Flat list reordering
    const newConnections = [...activeConnections];
    const dragId = dragIds[0];
    const oldIndex = newConnections.findIndex(c => c.id === dragId);
    if (oldIndex !== -1) {
      const [moved] = newConnections.splice(oldIndex, 1);
      newConnections.splice(index, 0, moved);
      setActiveConnections(newConnections);
    }
  };

  const handleMoveSaved = async ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    const dragId = dragIds[0];
    const itemType = dragId.startsWith('f-') ? 'folder' : 'host';
    
    // Arborist parentId is null for root
    await HostsService.moveItem(itemType, dragId, parentId, index);
    loadHosts();
  };

  const [modalState, setModalState] = useState<{
    type: 'host' | 'folder' | 'delete' | null;
    isEdit: boolean;
    node?: TreeNode;
  }>({ type: null, isEdit: false });

  const renderNodeActions = (node: any) => (
    <>
      <button 
        className="p-0.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
        onClick={(e) => { 
          e.stopPropagation(); 
          setModalState({ type: node.id.startsWith('f-') ? 'folder' : 'host', isEdit: true, node }); 
        }}
        title="Modifica"
      >
        <Icon name="settings" size={12} />
      </button>
      <button 
        className="p-0.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
        onClick={(e) => { 
          e.stopPropagation(); 
          setModalState({ type: 'delete', isEdit: false, node }); 
        }}
        title="Elimina"
      >
        <Icon name="close" size={12} />
      </button>
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SideBarSection 
        title="Active Connections"
        actions={<ActionButtonProper icon="plus" title="New Connection" onClick={() => {}} />}
      >
        <div className="flex flex-col">
          {activeConnections.length === 0 ? (
            <div className="px-5 py-2 text-[12px] text-rd-text-dim italic">No active connections</div>
          ) : (
            <TreeView
              ref={activeConnectionsTreeRef}
              nodes={mappedActiveConnections}
              selectedId={selectedHostId}
              onSelect={(node) => setSelectedHostId(node.id)}
              onMove={handleMoveActive}
              disableDropInto={true}
              showGuides={false}
              dndManager={dndManager}
              className="min-h-[50px]"
            />
          )}
        </div>
      </SideBarSection>

      <SideBarSection 
        title="Saved Hosts"
        actions={
          <>
            <ActionButtonProper icon="plus" title="Add Host" onClick={() => setModalState({ type: 'host', isEdit: false })} />
            <ActionButtonProper icon="folderPlus" title="Add Folder" onClick={() => setModalState({ type: 'folder', isEdit: false })} />
            <ActionButtonProper icon="fold" title="Collapse All" onClick={collapseAll} />
            <ActionButtonProper icon="maximize" title="Expand All" onClick={expandAll} />
            <ActionButtonProper icon="refresh" title="Reload" onClick={loadHosts} />
          </>
        }
      >
        {isLoading ? (
          <div className="px-5 py-2 text-[12px] text-rd-text-dim animate-pulse">Caricamento host...</div>
        ) : (
          <div className="pt-2 pb-12 overflow-y-auto">
            <TreeView
              ref={savedHostsTreeRef}
              nodes={hosts}
              selectedId={selectedHostId}
              onSelect={(node) => setSelectedHostId(node.id)}
              onToggleExpand={(id, expanded) => {
                HostsService.toggleFolder(id, expanded);
              }}
               renderNodeActions={renderNodeActions}
              onMove={handleMoveSaved}
              isSortable={true}
              dndManager={dndManager}
              initialOpenState={initialOpenState}
            />
          </div>
        )}
      </SideBarSection>

      <HostFormModal isOpen={modalState.type === 'host'} onClose={() => setModalState({ type: null, isEdit: false })} onSave={handleSaveHost} isEdit={modalState.isEdit} initialData={modalState.node?.data} />
      <FolderFormModal isOpen={modalState.type === 'folder'} onClose={() => setModalState({ type: null, isEdit: false })} onSave={handleSaveFolder} isEdit={modalState.isEdit} initialLabel={modalState.node?.label} />
      <DeleteConfirmModal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null, isEdit: false })} onConfirm={handleDeleteConfirm} title={modalState.node?.id.startsWith('f-') ? 'Elimina Cartella' : 'Elimina Host'} itemName={modalState.node?.label || ''} itemType={modalState.node?.id.startsWith('f-') ? 'folder' : 'host'} />
    </div>
  );
};
