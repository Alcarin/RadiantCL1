import React, { useState, useCallback, useRef, useMemo } from 'react';
import { SideBarSection } from './SideBarSection';
import { TreeView, TreeNode, TreeViewHandle } from '../ui/TreeView';
import { IconName } from '../ui/Icon';
import { HostsService } from '../../lib/hosts_service';
import { HostFormModal } from './modals/HostFormModal';
import { FolderFormModal } from './modals/FolderFormModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { LoginModal } from './modals/LoginModal';
import { CredentialsModal } from './modals/CredentialsModal';
import { db } from '../../../wailsjs/go/models';
import { getDndManager } from '../../lib/dnd';
import { EventsEmit, EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';
import { GetActiveConnections } from '../../../wailsjs/go/main/App';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [selectedHostId, setSelectedHostId] = useState<string | undefined>();
  

  
  const savedHostsTreeRef = useRef<TreeViewHandle>(null);
  const activeConnectionsTreeRef = useRef<TreeViewHandle>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: TreeNode } | null>(null);
  const [loginModal, setLoginModal] = useState<{ 
    isOpen: boolean, 
    node?: TreeNode,
    error?: string | null,
    isConnecting?: boolean
  }>({ isOpen: false });
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [hosts, setHosts] = useState<TreeNode[]>([]);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'host' | 'folder' | 'delete' | null;
    isEdit: boolean;
    node?: TreeNode;
  }>({ isOpen: false, type: null, isEdit: false });

  const loadHosts = useCallback(async () => {
    if (hosts.length === 0) setIsLoading(true);
    const tree = await HostsService.getHostsTree();
    setHosts(tree);
    setIsLoading(false);
  }, [hosts.length]);

  const loadActiveConnections = useCallback(async () => {
    try {
      const connections = await GetActiveConnections();
      setActiveConnections(connections || []);
    } catch (err) {
      console.error("Failed to load active connections:", err);
    }
  }, []);

  React.useEffect(() => {
    loadHosts();
    loadActiveConnections();
  }, [loadHosts, loadActiveConnections]);

  React.useEffect(() => {
    EventsOn('terminal:sessions-updated', loadActiveConnections);
    
    // Listener per richieste di login dalla MenuBar
    const offRequestLogin = EventsOn('app:request-login', (node: TreeNode) => {
      setLoginModal({ isOpen: true, node, error: null, isConnecting: false });
    });

    return () => {
      EventsOff('terminal:sessions-updated');
      offRequestLogin();
    };
  }, [loadActiveConnections]);

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

  const handleConnect = async (node: TreeNode, username = '', password = '') => {
     if (node.id.startsWith('f-')) return;
     
     // Se SSH e non abbiamo credenziali e l'host non ha un profilo associato, apri la modale
     if (node.data.type === 'ssh' && !username && !node.data.credentialId) {
       setLoginModal({ isOpen: true, node, error: null, isConnecting: false });
       setContextMenu(null);
       return;
     }

     if (username) {
       setLoginModal(prev => ({ ...prev, isConnecting: true, error: null }));
     }

     try {
       const hostId = HostsService.parseId(node.id);
       if (hostId === undefined) return;
       
       // Emette l'evento che verrà catturato da App.tsx (che usa useTerminalConnection)
       EventsEmit('app:connect', {
         hostId,
         name: node.label,
         icon: node.icon || 'terminal',
         address: node.data.address,
         port: node.data.port,
         type: node.data.type,
         user: username,
         pass: password
       });
       
       setLoginModal({ isOpen: false });
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : String(err);
       console.error("Connection failed:", errorMessage);
       
       if (node.data.type === 'ssh') {
         setLoginModal(prev => ({ ...prev, isOpen: true, node, error: errorMessage, isConnecting: false }));
       } else {
         alert(`Errore di connessione: ${errorMessage}`);
       }
     }
     setContextMenu(null);
  };

  const onNodeContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    if (node.id.startsWith('f-')) return;
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!modalState.node) return;
    if (modalState.node.id.startsWith('f-')) await HostsService.deleteFolder(modalState.node.id);
    else await HostsService.deleteHost(modalState.node.id);
    if (selectedHostId === modalState.node.id) setSelectedHostId(undefined);
    setModalState({ isOpen: false, type: null, isEdit: false });
    loadHosts();
  };

  // MAPPING: Active Connections to TreeNode
  const mappedActiveConnections = useMemo(() => {
    return activeConnections.map((c: any) => ({
      id: c.id,
      label: c.name,
      status: c.status,
      icon: (c.icon || 'network') as IconName,
      data: { ...c, label: c.name, icon: c.icon || 'network' }
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


  const renderNodeActions = (node: any) => (
    <>
      <button 
        className="p-0.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
        onClick={(e) => { 
          e.stopPropagation(); 
          setModalState({ isOpen: true, type: node.id.startsWith('f-') ? 'folder' : 'host', isEdit: true, node }); 
        }}
        title={t('common.edit')}
      >
        <Icon name="settings" size={12} />
      </button>
      <button 
        className="p-0.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
        onClick={(e) => { 
          e.stopPropagation(); 
          setModalState({ isOpen: true, type: 'delete', isEdit: false, node }); 
        }}
        title={t('common.delete')}
      >
        <Icon name="close" size={12} />
      </button>
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-rd-border">
        <SideBarSection 
          title={t('common.activeConnections')}
          actions={<ActionButtonProper icon="plus" title={t('common.connect')} onClick={() => {}} />}
        >
          <div className="flex flex-col flex-initial overflow-hidden">
            {activeConnections.length === 0 ? (
              <div className="px-5 py-2 text-[12px] text-rd-text-dim italic">{t('common.noActiveConnections')}</div>
            ) : (
              <TreeView
                ref={activeConnectionsTreeRef}
                nodes={mappedActiveConnections}
                selectedId={selectedHostId}
                onSelect={(node) => setSelectedHostId(node.id)}
                onMove={handleMoveActive}
                disableDropInto={true}
                showGuides={false}
                height={(mappedActiveConnections.length * 22) + 4}
              />
            )}
          </div>
        </SideBarSection>
      </div>

      <div className="flex-1 min-h-0">
        <SideBarSection 
          title={t('common.savedHosts')}
          actions={
            <>
              <ActionButtonProper icon="plus" title={t('common.addHost')} onClick={() => setModalState({ isOpen: true, type: 'host', isEdit: false })} />
              <ActionButtonProper icon="folderPlus" title={t('common.addFolder')} onClick={() => setModalState({ isOpen: true, type: 'folder', isEdit: false })} />
              <ActionButtonProper icon="keyRound" title={t('modals.credentialManager')} onClick={() => setIsCredentialsModalOpen(true)} />
              <ActionButtonProper icon="fold" title={t('common.collapseAll')} onClick={collapseAll} />
              <ActionButtonProper icon="maximize" title={t('common.expandAll')} onClick={expandAll} />
              <ActionButtonProper icon="refresh" title={t('common.reload')} onClick={loadHosts} />
            </>
          }
        >
          {isLoading ? (
            <div className="px-5 py-2 text-[12px] text-rd-text-dim animate-pulse">{t('common.loading')}</div>
          ) : (
            <div className="pt-2 pb-12 overflow-y-auto h-full">
              <TreeView
                ref={savedHostsTreeRef}
                nodes={hosts}
                selectedId={selectedHostId}
                onSelect={(node) => setSelectedHostId(node.id)}
                onToggleExpand={(id, expanded) => {
                  HostsService.toggleFolder(id, expanded);
                }}
                renderNodeActions={renderNodeActions}
                onNodeDoubleClick={handleConnect}
                onNodeContextMenu={onNodeContextMenu}
                onMove={handleMoveSaved}
                isSortable={true}
                initialOpenState={initialOpenState}
                className="h-full"
              />
            </div>
          )}
        </SideBarSection>
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-rd-dropdown border border-rd-border shadow-xl rounded-md py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-rd-list-hover flex items-center gap-2"
            onClick={() => handleConnect(contextMenu.node)}
          >
            <Icon name="network" size={14} className="text-rd-accent" />
            <span>{t('common.connect')}</span>
          </button>
          <div className="h-px bg-rd-border my-1" />
          <button 
            className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-rd-list-hover flex items-center gap-2"
            onClick={() => {
              setModalState({ isOpen: true, type: 'host', isEdit: true, node: contextMenu.node });
              setContextMenu(null);
            }}
          >
            <Icon name="settings" size={14} />
            <span>{t('modals.editHost')}</span>
          </button>
        </div>
      )}

      <HostFormModal 
        isOpen={modalState.isOpen && modalState.type === 'host'} 
        onClose={() => setModalState({ isOpen: false, type: null, isEdit: false })} 
        onSave={handleSaveHost} 
        isEdit={modalState.isEdit} 
        initialData={modalState.node?.data} 
        onOpenCredentials={() => {
          setModalState({ isOpen: false, type: null, isEdit: false }); // Chiudi host form
          setIsCredentialsModalOpen(true);
        }}
      />
      <FolderFormModal isOpen={modalState.isOpen && modalState.type === 'folder'} onClose={() => setModalState({ isOpen: false, type: null, isEdit: false })} onSave={handleSaveFolder} isEdit={modalState.isEdit} initialLabel={modalState.node?.label} />
      <DeleteConfirmModal isOpen={modalState.isOpen && modalState.type === 'delete'} onClose={() => setModalState({ isOpen: false, type: null, isEdit: false })} onConfirm={handleDeleteConfirm} title={modalState.node?.id.startsWith('f-') ? t('modals.deleteFolder') : t('modals.deleteHost')} itemName={modalState.node?.label || ''} itemType={modalState.node?.id.startsWith('f-') ? 'folder' : 'host'} />
      <LoginModal 
        isOpen={loginModal.isOpen} 
        onClose={() => setLoginModal({ isOpen: false })} 
        onLogin={(user, pass) => loginModal.node && handleConnect(loginModal.node, user, pass)} 
        hostName={loginModal.node?.label || ''} 
        error={loginModal.error}
        isConnecting={loginModal.isConnecting}
      />
      <CredentialsModal 
        isOpen={isCredentialsModalOpen} 
        onClose={() => setIsCredentialsModalOpen(false)} 
      />
    </div>
  );
};
