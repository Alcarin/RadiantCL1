import { useState, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { OpenConfig } from '../wailsjs/go/main/App';
import { main, db } from '../wailsjs/go/models';
import { ASTNodeView } from './components/ASTNodeView';

import { Layout } from './components/layout/Layout';
import { ActivityBar } from './components/layout/ActivityBar';
import { SideBar } from './components/layout/SideBar';
import { StatusBar } from './components/layout/StatusBar';
import { MenuBar } from './components/layout/MenuBar';
import { EditorMosaic, MosaicId } from './components/layout/EditorMosaic';
import { EditorGroup } from './components/layout/EditorGroup';
import { TreeView, TreeNode } from './components/ui/TreeView';
import { Icon, IconName } from './components/ui/Icon';
import { useLocalStorage } from './hooks/useLocalStorage';
import { MosaicNode } from 'react-mosaic-component';
import { ConnectionsView } from './components/layout/ConnectionsView';
import { HistoryView } from './components/layout/HistoryView';
import { SideBarSection } from './components/layout/SideBarSection';

import { getDndManager } from './lib/dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';
import { useTranslation } from 'react-i18next';
import { SettingsService } from './lib/settings_service';

// Interface for all open components in tabs
interface OpenTab {
  id: string;
  name: string;
  type: 'editor' | 'terminal' | 'log-viewer';
  content?: string; // For editor or log viewer
  sessionId?: string; // For terminal
  hostId?: number; // Optional reference
  icon?: IconName; // Host specific icon
  ast?: any; // For cisco config AST
  logHost?: string; // For log-viewer
  logFilename?: string; // For log-viewer
}


import { EventsEmit, EventsOn, EventsOff, LogError } from '../wailsjs/runtime/runtime';
import { useEffect } from 'react';
import { CloseTerminal, GetHostWithCredentials, AbortConnection, UpdateHostAllowDeprecated } from '../wailsjs/go/main/App';
import { ProtocolConnectModal, ProtocolRequestData } from './components/layout/modals/ProtocolConnectModal';
import { ConnectionLogModal } from './components/layout/modals/ConnectionLogModal';
import { useTerminalConnection } from './hooks/useTerminalConnection';

function App() {
  // State
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeSideBar, setActiveSideBar] = useLocalStorage<'connections' | 'explorer' | 'ast' | 'history'>('activeSideBar', 'connections');

  const [mosaicLayout, setMosaicLayout] = useLocalStorage<MosaicNode<MosaicId> | null>('mosaicLayout', 'main-group');
  const [activeTabPerGroup, setActiveTabPerGroup] = useState<Record<string, string>>({ 'main-group': '' });
  const [sideBarVisible, setSideBarVisible] = useState(true);
  const { t, i18n } = useTranslation();

  // Protocol Request State
  const [protocolRequest, setProtocolRequest] = useState<{
    isOpen: boolean;
    data: ProtocolRequestData | null;
    existingHost: db.Host | null;
    savedUsername: string;
  }>({
    isOpen: false,
    data: null,
    existingHost: null,
    savedUsername: ''
  });

  // Load language on startup
  useEffect(() => {
    const loadLang = async () => {
      const lang = await SettingsService.getLanguage();
      if (lang && lang !== i18n.language) {
        i18n.changeLanguage(lang);
      }
    };
    loadLang();
  }, [i18n]);

  const handleOpenTerminal = (data: { sessionId: string, name: string, hostId: number, icon: IconName }) => {
    const tabId = `term-${data.sessionId}`;
    
    setOpenTabs(prev => {
      // Evita di riaprire lo stesso terminale se già aperto (opzionale)
      const alreadyOpen = prev.find(t => t.sessionId === data.sessionId);
      if (alreadyOpen) {
        setActiveTabPerGroup(pg => ({ ...pg, 'main-group': alreadyOpen.id }));
        return prev;
      }

      const newTab: OpenTab = {
        id: tabId,
        name: data.name,
        type: 'terminal',
        sessionId: data.sessionId,
        hostId: data.hostId,
        icon: data.icon
      };
      return [...prev, newTab];
    });
    
    setActiveTabPerGroup(prev => ({ ...prev, 'main-group': tabId }));
  };

  // Connection Hook
  const { 
    state: connState, 
    connect: startConnection, 
    retry: retryConnection,
    abort: abortConnection, 
    close: closeConnModal 
  } = useTerminalConnection((data) => handleOpenTerminal(data));

  const handleRetryConnection = async (savePreference: boolean) => {
    if (savePreference && connState.hostId > 0) {
      await UpdateHostAllowDeprecated(connState.hostId, true);
    }
    retryConnection(true);
  };

  // Listen for terminal open events
  useEffect(() => {
    const handleHostUpdated = (updatedHost: db.Host) => {
      setOpenTabs(prev => prev.map(tab => {
        if (tab.hostId === updatedHost.id) {
          return {
            ...tab,
            name: updatedHost.label,
            icon: updatedHost.icon as IconName
          };
        }
        return tab;
      }));
    };

    const handleProtocolRequest = async (parts: ProtocolRequestData) => {
      console.log("[App] Protocol Request Received:", parts);
      try {
        const match = await GetHostWithCredentials(parts.host);
        
        if (match && match.host) {
          // Se l'utente non è specificato nel link OR è uguale a quello salvato -> connetti subito
          if (!parts.user || parts.user === match.username) {
            startConnection(
              match.host.id, 
              match.host.label, 
              match.host.icon as IconName, 
              match.host.address, 
              match.host.port, 
              match.host.type,
              '', 
              ''
            );
            return;
          }

          // Altrimenti chiedi all'utente tramite modale
          setProtocolRequest({
            isOpen: true,
            data: parts,
            existingHost: match.host,
            savedUsername: match.username
          });
        } else {
          // Nessun host trovato: connessione veloce immediata
          // Usiamo delle variabili di appoggio per gestire eventuali discrepanze di case tra Go e JS
          const p_host = parts.host || (parts as any).Host || "";
          const p_port = parts.port || (parts as any).Port || (parts.protocol === 'telnet' ? 23 : 22);
          const p_user = parts.user || (parts as any).User || "";
          const p_proto = parts.protocol || (parts as any).Protocol || 'ssh';
          const p_pass = parts.password || (parts as any).Password || "";

          const sessionName = p_user ? `${p_user}@${p_host}` : p_host;
          
          console.log("[App] Starting Ad-hoc Connection:", { p_host, p_port, p_proto, p_user });

          startConnection(
            0, 
            sessionName, 
            'terminal', 
            p_host, 
            p_port, 
            p_proto, 
            p_user, 
            p_pass
          );
        }
      } catch (err) {
        LogError(`Failed to handle protocol request: ${err}`);
      }
    };

    const handleOpenLog = (data: { host: string, filename: string, content: string, timestamp: string }) => {
      const tabId = `log-${data.host}-${data.filename}`;
      // Locale sistema (undefined), formato data + ora completa, 24h
      const dateLabel = data.timestamp
        ? new Date(data.timestamp).toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
          })
        : data.filename;
      const name = `${data.host} ${dateLabel}`;
      
      setOpenTabs(prev => {
        const alreadyOpen = prev.find(t => t.id === tabId);
        if (alreadyOpen) {
          setActiveTabPerGroup(pg => ({ ...pg, 'main-group': tabId }));
          return prev;
        }

        const newTab: OpenTab = {
          id: tabId,
          name: name,
          type: 'log-viewer',
          content: data.content,
          logHost: data.host,
          logFilename: data.filename,
          icon: 'clock'
        };
        return [...prev, newTab];
      });
      setActiveTabPerGroup(prev => ({ ...prev, 'main-group': tabId }));
    };

    EventsOn('app:open-terminal', handleOpenTerminal);
    EventsOn('app:host-updated', handleHostUpdated);
    EventsOn('app:protocol-request', handleProtocolRequest);
    EventsOn('app:open-log', handleOpenLog);

    // Global listener for connection requests from other components
    const offConnect = EventsOn('app:connect', (data: { 
      hostId: number, 
      name: string, 
      icon: IconName, 
      address: string,
      port: number,
      type: string,
      user?: string, 
      pass?: string 
    }) => {
      startConnection(
        data.hostId, 
        data.name, 
        data.icon, 
        data.address, 
        data.port, 
        data.type, 
        data.user || '', 
        data.pass || ''
      );
    });

    return () => {
      EventsOff('app:open-terminal');
      EventsOff('app:host-updated');
      EventsOff('app:protocol-request');
      EventsOff('app:open-log');
      offConnect();
    };

  }, []);

  // Monitor active tab changes to notify sidebar
  useEffect(() => {
    const activeId = activeTabPerGroup['main-group'];
    const activeTab = openTabs.find(t => t.id === activeId);
    if (activeId) {
      EventsEmit('app:tab-changed', activeTab);
    }
  }, [activeTabPerGroup, openTabs]);


  // Handlers
  const handleOpenConfig = async () => {
    try {
      const res = await OpenConfig();
      if (!res) return;
      if (res.error && res.error !== "") {
        console.error("Error: " + res.error);
        return;
      }
      
      const tabId = `file-${Date.now()}`;
      setOpenTabs(prev => [...prev, { 
        id: tabId, 
        name: res.name || t('common.document') || 'document', 
        type: 'editor', 
        content: res.content,
        ast: res.ast
      }]);
      setActiveTabPerGroup(prev => ({ ...prev, 'main-group': tabId }));
    } catch (err) {
      console.error("Error: " + err);
    }
  };

  const closeTab = (id: string) => {
    const tabToRemove = openTabs.find(t => t.id === id);
    if (tabToRemove && tabToRemove.type === 'terminal' && tabToRemove.sessionId) {
      CloseTerminal(tabToRemove.sessionId).catch(err => {
        console.error("Failed to close terminal session:", err);
      });
    }
    setOpenTabs(prev => prev.filter(t => t.id !== id));
  };

  // Memoized Views
  const explorerNodes = useMemo<TreeNode[]>(() => {
    return openTabs
      .filter(t => t.type === 'editor')
      .map(t => ({
        id: t.id,
        label: t.name,
        icon: 'file' as const,
      }));
  }, [openTabs]);

  const activeTabInGroup = (groupId: string) => {
    const activeId = activeTabPerGroup[groupId];
    return openTabs.find(t => t.id === activeId);
  };

  // Shell Components
  const activityBar = (
    <ActivityBar
      activeId={activeSideBar}
      onSelect={(id) => {
        if (id === activeSideBar) setSideBarVisible(!sideBarVisible);
        else {
          setActiveSideBar(id as any);
          setSideBarVisible(true);
        }
      }}
      onSettingsClick={() => EventsEmit('app:open-preferences')}
      items={[
        { id: 'connections', icon: 'network', label: t('common.connections') },
        { id: 'explorer', icon: 'file', label: t('common.explorer') },
        { id: 'history', icon: 'clock', label: t('common.history') },
        { id: 'ast', icon: 'layout', label: t('common.astViewer') },
      ]}

    />
  );

  const sideBar = (
    <SideBar 
      title={
        activeSideBar === 'connections' ? t('common.connections') : 
        activeSideBar === 'explorer' ? t('common.explorer') : 
        activeSideBar === 'history' ? t('common.history') :
        activeSideBar === 'ast' ? t('common.astViewer') : 
        activeSideBar

      } 
    >
      {activeSideBar === 'connections' && <ConnectionsView />}
      {activeSideBar === 'history' && <HistoryView />}
      {activeSideBar === 'explorer' && (

        <SideBarSection 
          title={t('common.openEditors')}
          actions={
            <button onClick={handleOpenConfig} className="p-0.5 hover:bg-rd-list-hover rounded text-rd-text-dim hover:text-rd-text transition-colors">
              <Icon name="plus" size={14} />
            </button>
          }
        >
          <TreeView 
            nodes={explorerNodes}
            selectedId={activeTabPerGroup['main-group']}
            onSelect={(node) => setActiveTabPerGroup(prev => ({ ...prev, 'main-group': node.id }))}
          />
        </SideBarSection>
      )}
      {activeSideBar === 'ast' && (
        <div className="p-2 overflow-x-auto">
          {activeTabInGroup('main-group')?.ast ? (
            <ASTNodeView node={activeTabInGroup('main-group')!.ast!} defaultExpanded={true} />
          ) : (
            <div className="p-4 text-xs text-zinc-500 italic">{t('common.selectFileWithAst')}</div>
          )}
        </div>
      )}
    </SideBar>
  );

  const mainContent = (
    <EditorMosaic
      layout={mosaicLayout}
      onChange={setMosaicLayout}
      renderTile={(groupId) => {
        const activeTab = activeTabInGroup(groupId);
        return (
          <EditorGroup
            tabs={openTabs.map(t => ({ 
              id: t.id, 
              name: t.name, 
              type: t.type, 
              sessionId: t.sessionId,
              icon: t.icon,
              logHost: t.logHost,
              logFilename: t.logFilename
            }))}
            activeTabId={activeTabPerGroup[groupId] || ''}
            onTabSelect={(id) => setActiveTabPerGroup(prev => ({ ...prev, [groupId]: id }))}
            onTabClose={closeTab}
            content={activeTab?.content || ''}
            language="text"
          />
        );
      }}
    />
  );

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <Layout
        activityBar={activityBar}
        sideBar={sideBar}
        mainContent={mainContent}
        bottomPanel={<div className="p-4 text-zinc-500 text-xs">{t('common.terminalLogsOutput')}</div>}
        statusBar={<StatusBar />}
        topBar={<MenuBar onOpenFile={handleOpenConfig} />}
        sideBarVisible={sideBarVisible}
        bottomPanelVisible={false}
      />

      <ProtocolConnectModal 
        isOpen={protocolRequest.isOpen}
        onClose={() => setProtocolRequest(prev => ({ ...prev, isOpen: false }))}
        data={protocolRequest.data}
        existingHost={protocolRequest.existingHost}
        savedUsername={protocolRequest.savedUsername}
        onConfirm={async (useSaved) => {
          if (!protocolRequest.data || !protocolRequest.existingHost) return;
          
          const { data, existingHost } = protocolRequest;
          const address = useSaved ? existingHost.address : data.host;
          const port = useSaved ? existingHost.port : data.port;
          const type = useSaved ? existingHost.type : data.protocol;
          const user = useSaved ? '' : (data.user || '');
          const pass = useSaved ? '' : (data.password || '');
          
          try {
            startConnection(existingHost.id, existingHost.label, existingHost.icon as IconName, address, port, type, user, pass);
          } catch (err) {
            console.error(err);
          }
          setProtocolRequest(prev => ({ ...prev, isOpen: false }));
        }}
      />
      <ConnectionLogModal
        isOpen={connState.isOpen}
        onClose={closeConnModal}
        onAbort={abortConnection}
        onRetry={handleRetryConnection}
        hostName={connState.hostName}
        hostId={connState.hostId}
        entries={connState.entries}
        isConnecting={connState.isConnecting}
      />
    </DndProvider>
  );
}

export default App;
