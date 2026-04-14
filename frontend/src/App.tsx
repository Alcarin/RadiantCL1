import { useState, useMemo } from 'react';
import { OpenConfig } from '../wailsjs/go/main/App';
import { main } from '../wailsjs/go/models';
import { ASTNodeView } from './components/ASTNodeView';

import { Layout } from './components/layout/Layout';
import { ActivityBar } from './components/layout/ActivityBar';
import { SideBar } from './components/layout/SideBar';
import { StatusBar } from './components/layout/StatusBar';
import { MenuBar } from './components/layout/MenuBar';
import { EditorMosaic, MosaicId } from './components/layout/EditorMosaic';
import { EditorGroup } from './components/layout/EditorGroup';
import { TreeView, TreeNode } from './components/ui/TreeView';
import { useLocalStorage } from './hooks/useLocalStorage';
import { MosaicNode } from 'react-mosaic-component';
import { Icon } from './components/ui/Icon';

// Interface to wrap FileResponse without breaking class integrity
interface OpenFile {
  id: string;
  data: main.FileResponse;
}

function App() {
  // State
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeSideBar, setActiveSideBar] = useLocalStorage<'explorer' | 'ast' | 'search'>('activeSideBar', 'explorer');
  const [mosaicLayout, setMosaicLayout] = useLocalStorage<MosaicNode<MosaicId> | null>('mosaicLayout', 'main-group');
  const [activeTabPerGroup, setActiveTabPerGroup] = useState<Record<string, string>>({ 'main-group': '' });
  const [sideBarVisible, setSideBarVisible] = useState(true);

  // Handlers
  const handleOpenConfig = async () => {
    try {
      const res = await OpenConfig();
      if (!res) return;
      if (res.error && res.error !== "") {
        console.error("Error: " + res.error);
        return;
      }
      
      const fileId = `file-${Date.now()}`;
      // Wrap correctly
      setOpenFiles(prev => [...prev, { id: fileId, data: res }]);
      setActiveTabPerGroup(prev => ({ ...prev, 'main-group': fileId }));
    } catch (err) {
      console.error("Error: " + err);
    }
  };

  const closeFile = (id: string) => {
    setOpenFiles(prev => prev.filter(f => f.id !== id));
  };

  // Memoized Views
  const explorerNodes = useMemo<TreeNode[]>(() => {
    return openFiles.map(f => ({
      id: f.id,
      label: f.data.name || 'document',
      icon: 'file' as const,
    }));
  }, [openFiles]);

  const activeFileInGroup = (groupId: string) => {
    const activeId = activeTabPerGroup[groupId];
    return openFiles.find(f => f.id === activeId);
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
        { id: 'explorer', icon: 'file', label: 'Explorer' },
        { id: 'search', icon: 'search', label: 'Search' },
        { id: 'ast', icon: 'layout', label: 'AST Viewer' },
      ]}
    />
  );

  const sideBar = (
    <SideBar 
      title={activeSideBar} 
      actions={
        activeSideBar === 'explorer' ? (
          <button onClick={handleOpenConfig} className="p-1 hover:bg-zinc-800 rounded">
            <Icon name="plus" size={14} />
          </button>
        ) : null
      }
    >
      {activeSideBar === 'explorer' && (
        <div className="flex flex-col">
          {/* Section Header */}
          <div className="flex items-center h-[22px] px-1 hover:bg-rd-list-hover cursor-pointer text-rd-text-dim hover:text-rd-text transition-colors mt-0.5 mb-0.5">
            <Icon name="chevronDown" size={14} className="mr-0.5" />
            <span className="text-[11px] font-bold tracking-wide uppercase">Open Editors</span>
          </div>
          
          <TreeView 
            nodes={explorerNodes}
            selectedId={activeTabPerGroup['main-group']}
            onSelect={(node) => setActiveTabPerGroup(prev => ({ ...prev, 'main-group': node.id }))}
            indent={1}
          />
        </div>
      )}
      {activeSideBar === 'ast' && (
        <div className="p-2 overflow-x-auto">
          {activeFileInGroup('main-group')?.data.ast ? (
            <ASTNodeView node={activeFileInGroup('main-group')!.data.ast!} defaultExpanded={true} />
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
        const activeFile = activeFileInGroup(groupId);
        return (
          <EditorGroup
            tabs={openFiles.map(f => ({ id: f.id, name: f.data.name || '' }))}
            activeTabId={activeTabPerGroup[groupId] || ''}
            onTabSelect={(id) => setActiveTabPerGroup(prev => ({ ...prev, [groupId]: id }))}
            onTabClose={closeFile}
            content={activeFile?.data.content || ''}
            language="text"
          />
        );
      }}
    />
  );

  return (
    <Layout
      activityBar={activityBar}
      sideBar={sideBar}
      mainContent={mainContent}
      bottomPanel={<div className="p-4 text-zinc-500 text-xs">Terminal / Logs Output</div>}
      statusBar={<StatusBar />}
      topBar={<MenuBar />}
      sideBarVisible={sideBarVisible}
      bottomPanelVisible={true}
    />
  );
}

export default App;
