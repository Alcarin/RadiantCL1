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
import { SideBarSection } from './components/layout/SideBarSection';
import { getDndManager } from './lib/dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';

// Interface for all open components in tabs
interface OpenTab {
  id: string;
  name: string;
  type: 'editor' | 'terminal';
  content?: string; // For editor
  sessionId?: string; // For terminal
  hostId?: number; // Optional reference
  icon?: IconName; // Host specific icon
  ast?: any; // For cisco config AST
}

import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';
import { useEffect } from 'react';
import { CloseTerminal } from '../wailsjs/go/main/App';

function App() {
  // State
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeSideBar, setActiveSideBar] = useLocalStorage<'connections' | 'explorer' | 'ast' | 'search'>('activeSideBar', 'connections');
  const [mosaicLayout, setMosaicLayout] = useLocalStorage<MosaicNode<MosaicId> | null>('mosaicLayout', 'main-group');
  const [activeTabPerGroup, setActiveTabPerGroup] = useState<Record<string, string>>({ 'main-group': '' });
  const [sideBarVisible, setSideBarVisible] = useState(true);

  // Listen for terminal open events
  useEffect(() => {
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

    EventsOn('app:open-terminal', handleOpenTerminal);
    EventsOn('app:host-updated', handleHostUpdated);
    return () => {
      EventsOff('app:open-terminal');
      EventsOff('app:host-updated');
    };
  }, []);

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
        name: res.name || 'document', 
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
      items={[
        { id: 'connections', icon: 'network', label: 'Connections' },
        { id: 'explorer', icon: 'file', label: 'Explorer' },
        { id: 'search', icon: 'search', label: 'Search' },
        { id: 'ast', icon: 'layout', label: 'AST Viewer' },
      ]}
    />
  );

  const sideBar = (
    <SideBar 
      title={activeSideBar} 
    >
      {activeSideBar === 'connections' && <ConnectionsView />}
      {activeSideBar === 'explorer' && (
        <SideBarSection 
          title="Open Editors"
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
            <div className="p-4 text-xs text-zinc-500 italic">Seleziona un file con AST</div>
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
              icon: t.icon
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
        bottomPanel={<div className="p-4 text-zinc-500 text-xs">Terminal / Logs Output</div>}
        statusBar={<StatusBar />}
        topBar={<MenuBar onOpenFile={handleOpenConfig} />}
        sideBarVisible={sideBarVisible}
        bottomPanelVisible={true}
      />
    </DndProvider>
  );
}

export default App;
