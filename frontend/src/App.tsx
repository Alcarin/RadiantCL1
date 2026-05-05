import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { OpenConfig, SaveAppState, GetAppState, GetHost } from '../wailsjs/go/main/App';
import { main, db } from '../wailsjs/go/models';
import { ASTNodeView } from './components/ASTNodeView';

import logo from './assets/images/logo.svg';
import { Layout } from './components/layout/Layout';
import { ActivityBar } from './components/layout/ActivityBar';
import { SideBar } from './components/layout/SideBar';
import { StatusBar } from './components/layout/StatusBar';
import { MenuBar } from './components/layout/MenuBar';
import { EditorMosaic, MosaicId, LayoutNode } from './components/layout/EditorMosaic';
import { EditorGroup } from './components/layout/EditorGroup';
import { TreeView, TreeNode } from './components/ui/TreeView';
import { Icon, IconName } from './components/ui/Icon';
import { useLocalStorage } from './hooks/useLocalStorage';
import { terminalManager } from './lib/terminalManager';
import { editorManager } from './lib/editorManager';
import { ConnectionsView } from './components/layout/ConnectionsView';
import { HistoryView } from './components/layout/HistoryView';
import { SideBarSection } from './components/layout/SideBarSection';

import { getDndManager } from './lib/dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';
import { useTranslation } from 'react-i18next';
import { SettingsService } from './lib/settings_service';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

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
  logFile?: string; // For terminal logging
}


import { EventsEmit, EventsOn, EventsOff, LogError } from '../wailsjs/runtime/runtime';
import { CloseTerminal, GetHostWithCredentials, AbortConnection, UpdateHostAllowDeprecated } from '../wailsjs/go/main/App';
import { ProtocolConnectModal, ProtocolRequestData } from './components/layout/modals/ProtocolConnectModal';
import { ConnectionLogModal } from './components/layout/modals/ConnectionLogModal';
import { useTerminalConnection } from './hooks/useTerminalConnection';

function App() {
  // State
  const [tabRegistry, setTabRegistry] = useState<Record<string, OpenTab>>({});
  const [editorGroups, setEditorGroups] = useState<Record<string, string[]>>({ 'main-group': [] });
  const [activeSideBar, setActiveSideBar] = useState<'connections' | 'explorer' | 'ast' | 'history'>('connections');

  const [mosaicLayout, setMosaicLayout] = useState<LayoutNode | null>('main-group');
  const [activeTabPerGroup, setActiveTabPerGroup] = useState<Record<string, string>>({ 'main-group': '' });
  const [focusedGroupId, setFocusedGroupId] = useState<string>('main-group');
  const [sideBarVisible, setSideBarVisible] = useState(true);
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  // Refs per gestori eventi Wails (evitano stale closures senza re-register frequenti)
  const editorGroupsRef = useRef<Record<string, string[]>>(editorGroups);
  const focusedGroupIdRef = useRef<string>(focusedGroupId);
  useEffect(() => { editorGroupsRef.current = editorGroups; }, [editorGroups]);
  useEffect(() => { focusedGroupIdRef.current = focusedGroupId; }, [focusedGroupId]);

  // Guard: se il layout salvato è in formato non valido, resettiamo
  // v6 usa {direction, first, second} oppure stringa
  useEffect(() => {
    const isValid = (n: any): boolean => {
      if (n === null || typeof n === 'string') return true;
      if (typeof n === 'object' && n !== null) {
        // Formato v6: deve avere direction, first, second
        if ('direction' in n && 'first' in n && 'second' in n) {
          return isValid(n.first) && isValid(n.second);
        }
      }
      return false;
    };
    if (!isValid(mosaicLayout)) {
      console.warn('[RadiantCL1] Layout Mosaic non valido in localStorage, reset a main-group.');
      setMosaicLayout('main-group');
      setEditorGroups({ 'main-group': [] });
      setActiveTabPerGroup({ 'main-group': '' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Caricamento iniziale dello stato dal Backend (SQLite)
  useEffect(() => {
    const loadState = async () => {
      try {
        const stateJSON = await GetAppState();
        if (stateJSON) {
          const state = JSON.parse(stateJSON);
          if (state.tabRegistry) setTabRegistry(state.tabRegistry);
          if (state.editorGroups) setEditorGroups(state.editorGroups);
          if (state.activeSideBar) setActiveSideBar(state.activeSideBar || 'connections');
          if (state.mosaicLayout) setMosaicLayout(state.mosaicLayout);
          if (state.activeTabPerGroup) setActiveTabPerGroup(state.activeTabPerGroup);
        }
      } catch (err) {
        console.error("[RadiantCL1] Errore nel caricamento dello stato:", err);
      } finally {
        // Un piccolo ritardo per rendere il caricamento più piacevole
        setTimeout(() => setIsAppLoaded(true), 1000);
      }
    };
    loadState();
  }, []);

  // Salvataggio automatico dello stato (debounced)
  useEffect(() => {
    if (!isAppLoaded) return;

    const timer = setTimeout(() => {
      const state = {
        tabRegistry,
        editorGroups,
        activeSideBar,
        mosaicLayout,
        activeTabPerGroup
      };
      SaveAppState(JSON.stringify(state)).catch(err => {
        console.error("[RadiantCL1] Errore nel salvataggio dello stato:", err);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [tabRegistry, editorGroups, activeSideBar, mosaicLayout, activeTabPerGroup, isAppLoaded]);

  // Reidratazione sessioni attive (rimane per garantire che le sessioni Go siano allineate)
  useEffect(() => {
    if (!isAppLoaded) return;
    
    const syncActiveSessions = async () => {
      try {
        const { GetActiveConnections } = await import('../wailsjs/go/main/App');
        const sessions = await GetActiveConnections();
        if (!sessions || sessions.length === 0) return;

        // Qui potremmo fare logica di sync se necessario, ma per ora 
        // confidiamo che la tabRegistry caricata dal DB sia corretta.
        // Se una sessione non è attiva, verrà gestita in Fase 4 come Zombie.
      } catch (err) {
        console.debug('[RadiantCL1] Active session sync skipped:', err);
      }
    };
    syncActiveSessions();
  }, [isAppLoaded]);
  
  // ─── Sentinel del Layout: Auto-distruzione dei gruppi vuoti ────────────────
  useEffect(() => {
    const cleanupLayout = (node: LayoutNode | null): LayoutNode | null => {
      if (node === null) return null;
      if (typeof node === 'string') {
        // Un gruppo è valido solo se esiste nel registry e ha almeno una tab
        // ECCEZIONE: il main-group è il nostro fallback root
        const hasTabs = editorGroups[node] && editorGroups[node].length > 0;
        return (hasTabs || node === 'main-group') ? node : null;
      }
      const first = cleanupLayout(node.first as LayoutNode);
      const second = cleanupLayout(node.second as LayoutNode);
      
      if (first === null && second === null) return null;
      if (first === null) return second;
      if (second === null) return first;
      
      return { ...node, first, second };
    };

    const nextLayout = cleanupLayout(mosaicLayout as LayoutNode) || 'main-group';
    // Usiamo il confronto JSON per evitare loop infiniti di render
    if (JSON.stringify(nextLayout) !== JSON.stringify(mosaicLayout)) {
      setMosaicLayout(nextLayout);
    }
  }, [editorGroups, mosaicLayout]);

  const { t, i18n } = useTranslation();

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const handleOpenTerminal = useCallback((data: { sessionId: string, name: string, hostId: number, icon: IconName, logFile?: string }) => {
    const tabId = `term-${data.sessionId}`;
    
    // Check if already open anywhere
    if (tabRegistry[tabId]) {
      // Find which group has it
      const groupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(tabId)) || 'main-group';
      setFocusedGroupId(groupId);
      setActiveTabPerGroup(pg => ({ ...pg, [groupId]: tabId }));
      return;
    }

    const newTab: OpenTab = {
      id: tabId,
      name: data.name,
      type: 'terminal',
      sessionId: data.sessionId,
      hostId: data.hostId,
      icon: data.icon,
      logFile: data.logFile,
      logHost: data.name
    };

    const targetGroup = focusedGroupId || 'main-group';

    setTabRegistry(prev => ({ ...prev, [tabId]: newTab }));
    setEditorGroups(prev => {
      const groupTabs = prev[targetGroup] || [];
      if (groupTabs.includes(tabId)) return prev;
      return { ...prev, [targetGroup]: [...groupTabs, tabId] };
    });
    
    setActiveTabPerGroup(prev => ({ ...prev, [targetGroup]: tabId }));
  }, [tabRegistry, editorGroups, focusedGroupId]);


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

  const handleReconnectTerminal = useCallback(async (tabId: string) => {
    const tab = tabRegistry[tabId];
    if (!tab || tab.type !== 'terminal' || !tab.hostId) {
      console.warn(`[App] Cannot reconnect tab ${tabId}: missing hostId or not a terminal`);
      return;
    }

    try {
      const host = await GetHost(tab.hostId);
      if (!host) {
        console.error(`[App] Host ${tab.hostId} not found in DB`);
        return;
      }

      // Avviamo la connessione usando lo stesso sessionId della scheda
      // Questo permetterà di riagganciarsi all'istanza xterm esistente
      startConnection(
        host.id, 
        host.label, 
        host.icon as IconName, 
        host.address, 
        host.port, 
        host.type, 
        '', // Username/Password verranno chiesti se non salvati
        '', 
        host.allowDeprecated,
        tab.sessionId
      );
    } catch (err) {
      console.error(`[App] Reconnect failed:`, err);
    }
  }, [tabRegistry, startConnection]);

  // Listen for terminal open events
  useEffect(() => {
    const handleHostUpdated = (updatedHost: db.Host) => {
      setTabRegistry(prev => {
        const newReg = { ...prev };
        let changed = false;
        Object.keys(newReg).forEach(id => {
          if (newReg[id].hostId === updatedHost.id) {
            newReg[id] = {
              ...newReg[id],
              name: updatedHost.label,
              icon: updatedHost.icon as IconName
            };
            changed = true;
          }
        });
        return changed ? newReg : prev;
      });
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
      
      const dateLabel = data.timestamp
        ? new Date(data.timestamp).toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
          })
        : data.filename;
      const name = `${data.host} ${dateLabel}`;
      
      const newTab: OpenTab = {
        id: tabId,
        name: name,
        type: 'log-viewer',
        content: data.content,
        logHost: data.host,
        logFilename: data.filename,
        icon: 'clock'
      };

      setTabRegistry(prev => {
        if (prev[tabId]) return prev;
        return { ...prev, [tabId]: newTab };
      });

      // Usiamo l'aggiornamento funzionale per evitare race conditions sulla duplicazione dei tasti
      setEditorGroups(prevGroups => {
        // 1. Controlla se la tab è già presente in QUALSIASI gruppo
        let existingGroupId: string | null = null;
        for (const [gid, tabs] of Object.entries(prevGroups)) {
          if ((tabs as string[]).includes(tabId)) {
            existingGroupId = gid;
            break;
          }
        }

        if (existingGroupId) {
          // La tab esiste già, non facciamo nulla qui (il focus verrà gestito dopo)
          return prevGroups;
        } else {
          // La tab non esiste, aggiungila al gruppo a fuoco (fallback su main-group)
          const target = focusedGroupIdRef.current || 'main-group';
          const groupTabs = prevGroups[target] || [];
          return { ...prevGroups, [target]: [...groupTabs, tabId] };
        }
      });

      // Gestione del focus e selezione (separata dall'aggiornamento strutturale)
      setTimeout(() => {
        setEditorGroups(current => {
          let foundGid: string | null = null;
          for (const [gid, tabs] of Object.entries(current)) {
            if (tabs.includes(tabId)) { foundGid = gid; break; }
          }
          if (foundGid) {
            setFocusedGroupId(foundGid);
            setActiveTabPerGroup(prev => ({ ...prev, [foundGid!]: tabId }));
          }
          return current;
        });
      }, 0);
    };

    EventsOff('app:host-updated');
    EventsOn('app:host-updated', handleHostUpdated);
    
    EventsOff('app:protocol-request');
    EventsOn('app:protocol-request', handleProtocolRequest);
    
    EventsOff('app:open-log');
    EventsOn('app:open-log', handleOpenLog);

    // Global listener for connection requests from other components
    // We use a timestamp to debounce potential multiple triggers in a single tick
    let lastConnectTime = 0;
    
    EventsOff('app:connect');
    const offConnect = EventsOn('app:connect', (data: { 
      senderId: string,
      hostId: number, 
      name: string, 
      icon: IconName, 
      address: string,
      port: number,
      type: string,
      user?: string, 
      pass?: string 
    }) => {
      // Filtra gli eventi: processa solo quelli scatenati da questa specifica istanza
      if (data.senderId !== (window as any).__radiant_instance_id) return;

      const now = Date.now();
      if (now - lastConnectTime < 1000) return; // Debounce 1s per evitare trigger multipli da click rapidi
      lastConnectTime = now;

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
      EventsOff('app:host-updated');
      EventsOff('app:protocol-request');
      EventsOff('app:open-log');
      offConnect();
    };

  }, []);

  // Monitora il cambio della tab attiva o del focus per notificare la barra laterale (playback, etc)
  useEffect(() => {
    const activeId = activeTabPerGroup[focusedGroupId];
    const activeTab = tabRegistry[activeId];
    if (activeId && activeTab) {
      EventsEmit('app:tab-changed', activeTab);
    } else if (!activeId) {
      // Se il gruppo a fuoco non ha tab (raro ma possibile durante il drag), 
      // proviamo a prendere la tab dell'ultimo gruppo valido
      const fallbackGroupId = Object.keys(activeTabPerGroup).find(gid => activeTabPerGroup[gid]);
      if (fallbackGroupId) {
        const fallbackTab = tabRegistry[activeTabPerGroup[fallbackGroupId]];
        if (fallbackTab) EventsEmit('app:tab-changed', fallbackTab);
      }
    }
  }, [activeTabPerGroup, focusedGroupId, tabRegistry]);


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
      const newTab: OpenTab = { 
        id: tabId, 
        name: res.name || t('common.document') || 'document', 
        type: 'editor', 
        content: res.content,
        ast: res.ast
      };

      setTabRegistry(prev => ({ ...prev, [tabId]: newTab }));
      const targetGroup = focusedGroupId || 'main-group';
      setEditorGroups(prev => {
        const groupTabs = prev[targetGroup] || [];
        return { ...prev, [targetGroup]: [...groupTabs, tabId] };
      });
      setActiveTabPerGroup(prev => ({ ...prev, [targetGroup]: tabId }));
    } catch (err) {
      console.error("Error: " + err);
    }
  };

  const closeTab = (id: string, groupId: string = 'main-group') => {
    const tabToRemove = tabRegistry[id];
    if (!tabToRemove) return;

    if (tabToRemove.type === 'terminal' && tabToRemove.sessionId) {
      CloseTerminal(tabToRemove.sessionId).catch(err => {
        console.error("Failed to close terminal session:", err);
      });
    }

    // Smart selection logic
    const groupTabs = editorGroups[groupId] || [];
    const index = groupTabs.indexOf(id);
    if (activeTabPerGroup[groupId] === id && groupTabs.length > 1) {
      const nextId = index > 0 ? groupTabs[index - 1] : groupTabs[index + 1];
      setActiveTabPerGroup(prev => ({ ...prev, [groupId]: nextId }));
    }

    // Update group
    setEditorGroups(prev => {
      const newGroupTabs = (prev[groupId] || []).filter(tid => tid !== id);
      const newGroups = { ...prev, [groupId]: newGroupTabs };
      
      // Pulizia dei gruppi vuoti dal layout Mosaic
      const cleanupLayout = (node: LayoutNode | null): LayoutNode | null => {
        if (node === null) return null;
        if (typeof node === 'string') {
          // Se il nodo è un ID di gruppo, verifica se ha ancora tab (o se è l'ultimo rimasto)
          const hasTabs = newGroups[node] && newGroups[node].length > 0;
          return hasTabs ? node : null;
        }
        const first = cleanupLayout(node.first as LayoutNode);
        const second = cleanupLayout(node.second as LayoutNode);
        
        if (first === null && second === null) return null;
        if (first === null) return second;
        if (second === null) return first;
        
        return { ...node, first, second };
      };

      const nextLayout = cleanupLayout(mosaicLayout as LayoutNode) || 'main-group';
      if (JSON.stringify(nextLayout) !== JSON.stringify(mosaicLayout)) {
        setMosaicLayout(nextLayout);
      }

      const isStillOpen = Object.values(newGroups).some(tabs => tabs.includes(id));
      if (!isStillOpen) {
        // Pulizia istanze Singleton solo se la tab non è più presente in nessun gruppo
        if (tabToRemove.type === 'terminal' && tabToRemove.sessionId) {
          terminalManager.removeInstance(tabToRemove.sessionId);
        }
        if (tabToRemove.type === 'editor' || tabToRemove.type === 'log-viewer') {
          editorManager.removeInstance(id);
        }

        setTabRegistry(reg => {
          const newReg = { ...reg };
          delete newReg[id];
          return newReg;
        });
      }
      return newGroups;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Logic for internal reorder or move between groups
    // overId can be a tab ID or a drop zone ID (split-top-groupId, etc)
    
    if (overId.startsWith('split-')) {
      const parts = overId.split('-');
      const direction = parts[1];
      const targetGroupId = parts.slice(2).join('-');
      handleTabSplit(activeId, targetGroupId, direction as any);
      return;
    }

    if (overId.toString().startsWith('group-')) {
      const targetGroupId = overId.toString().replace('group-', '');
      const activeGroupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(activeId));
      
      if (!activeGroupId || activeGroupId === targetGroupId) return;

      setEditorGroups(prev => {
        const newGroups = { ...prev };
        newGroups[activeGroupId] = prev[activeGroupId].filter(id => id !== activeId);
        newGroups[targetGroupId] = [...(prev[targetGroupId] || []), activeId];
        return newGroups;
      });
      setActiveTabPerGroup(prev => ({ ...prev, [targetGroupId]: activeId }));
      return;
    }

    // Find groups for active and over
    const activeGroupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(activeId));
    const overGroupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(overId));

    if (!activeGroupId || !overGroupId) return;

    if (activeGroupId === overGroupId) {
      // Reorder within group
      const oldIndex = editorGroups[activeGroupId].indexOf(activeId);
      const newIndex = editorGroups[activeGroupId].indexOf(overId);
      if (oldIndex !== newIndex) {
        setEditorGroups(prev => ({
          ...prev,
          [activeGroupId]: arrayMove(prev[activeGroupId], oldIndex, newIndex)
        }));
      }
    } else {
      // Move between groups
      setEditorGroups(prev => {
        const newActiveGroup = prev[activeGroupId].filter(id => id !== activeId);
        const overIndex = prev[overGroupId].indexOf(overId);
        const newOverGroup = [...prev[overGroupId]];
        newOverGroup.splice(overIndex, 0, activeId);
        
        const newGroups = {
          ...prev,
          [activeGroupId]: newActiveGroup,
          [overGroupId]: newOverGroup
        };

        // Se il gruppo di origine è diventato vuoto, rimuoviamolo dal layout Mosaic
        if (newActiveGroup.length === 0 && activeGroupId !== 'main-group') {
          const removeNode = (node: LayoutNode | null): LayoutNode | null => {
            if (node === null || typeof node === 'string') return node === activeGroupId ? null : node;
            const first = removeNode(node.first as LayoutNode);
            const second = removeNode(node.second as LayoutNode);
            if (first === null) return second;
            if (second === null) return first;
            return { ...node, first, second };
          };
          setMosaicLayout(prev => removeNode(prev as LayoutNode));
        }

        return newGroups;
      });
      setActiveTabPerGroup(prev => ({ ...prev, [overGroupId]: activeId }));
    }
  };

  const handleTabSplit = (tabId: string, targetGroupId: string, direction: 'top' | 'bottom' | 'left' | 'right') => {
    const newGroupId = `group-${Date.now()}`;
    
    // 1. Aggiorna layout Mosaic v6 (format: {direction, first, second})
    const splitNode = (node: LayoutNode | null): LayoutNode => {
      if (node === null) return newGroupId;
      if (typeof node === 'string') {
        if (node === targetGroupId) {
          const isVertical = direction === 'top' || direction === 'bottom';
          const a = direction === 'top' || direction === 'left' ? newGroupId : targetGroupId;
          const b = direction === 'top' || direction === 'left' ? targetGroupId : newGroupId;
          return {
            direction: isVertical ? 'column' : 'row',
            first: a,
            second: b,
            splitPercentage: 50,
          } as LayoutNode;
        }
        return node;
      }
      return {
        ...node,
        first: splitNode(node.first as LayoutNode),
        second: splitNode(node.second as LayoutNode),
      } as LayoutNode;
    };

    setMosaicLayout(prev => splitNode(prev as LayoutNode));

    // 2. Move tab to the new group
    setEditorGroups(prev => {
      const sourceGroupId = Object.keys(prev).find(gid => prev[gid].includes(tabId));
      const newGroups = { ...prev };
      
      if (sourceGroupId) {
        newGroups[sourceGroupId] = prev[sourceGroupId].filter(id => id !== tabId);
        
        // Handle active tab in source group if needed
        if (activeTabPerGroup[sourceGroupId] === tabId && newGroups[sourceGroupId].length > 0) {
          setActiveTabPerGroup(pg => ({ ...pg, [sourceGroupId]: newGroups[sourceGroupId][0] }));
        }
      }
      newGroups[newGroupId] = [tabId];
      return newGroups;
    });

    // 3. Set active tab for the new group and focus it
    setActiveTabPerGroup(prev => ({ ...prev, [newGroupId]: tabId }));
    setFocusedGroupId(newGroupId);
  };

  // Memoized Views
  const explorerNodes = useMemo<TreeNode[]>(() => {
    return Object.values(tabRegistry)
      .filter(t => t.type === 'editor')
      .map(t => ({
        id: t.id,
        label: t.name,
        icon: 'file' as const,
      }));
  }, [tabRegistry]);

  const activeTabInGroup = (groupId: string) => {
    const activeId = activeTabPerGroup[groupId];
    return tabRegistry[activeId];
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
      {activeSideBar === 'connections' && (
        <ConnectionsView 
          tabRegistry={tabRegistry} 
          onSelectTerminal={(sessionId) => {
            const tabId = `term-${sessionId}`;
            const groupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(tabId)) || 'main-group';
            setActiveTabPerGroup(prev => ({ ...prev, [groupId]: tabId }));
            setFocusedGroupId(groupId);
          }}
        />
      )}
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
            selectedId={activeTabPerGroup[focusedGroupId]}
            onSelect={(node) => {
              // Trova il gruppo che contiene già questa tab
              const groupId = Object.keys(editorGroups).find(gid => editorGroups[gid].includes(node.id));
              if (groupId) {
                setFocusedGroupId(groupId);
                setActiveTabPerGroup(prev => ({ ...prev, [groupId]: node.id }));
              }
            }}
          />
        </SideBarSection>
      )}
      {activeSideBar === 'ast' && (
        <div className="p-2 overflow-x-auto">
          {activeTabInGroup(focusedGroupId)?.ast ? (
            <ASTNodeView node={activeTabInGroup(focusedGroupId)!.ast!} defaultExpanded={true} />
          ) : (
            <div className="p-4 text-xs text-zinc-500 italic">{t('common.selectFileWithAst')}</div>
          )}
        </div>
      )}
    </SideBar>
  );

  const renderTile = useCallback((groupId: string) => {
    const activeTabId = activeTabPerGroup[groupId];
    const activeTab = tabRegistry[activeTabId];
    const groupTabIds = editorGroups[groupId] || [];
    const groupTabs = groupTabIds.map(tid => tabRegistry[tid]).filter(Boolean);

    return (
      <EditorGroup
        groupId={groupId}
        tabs={groupTabs.map(t => ({ 
          id: t.id, 
          name: t.name, 
          type: t.type, 
          sessionId: t.sessionId,
          icon: t.icon,
          logHost: t.logHost,
          logFilename: t.logFilename,
          logFile: t.logFile
        }))}
        activeTabId={activeTabId || ''}
        isFocused={groupId === focusedGroupId}
        onTabSelect={(id) => {
          setActiveTabPerGroup(prev => ({ ...prev, [groupId]: id }));
          setFocusedGroupId(groupId);
        }}
        onTabClose={(id) => closeTab(id, groupId)}
        onReconnect={handleReconnectTerminal}
        onFocus={() => setFocusedGroupId(groupId)}
        content={activeTab?.content || ''}
        language="text"
        isDragging={!!activeDragId}
      />
    );
  }, [editorGroups, tabRegistry, activeTabPerGroup, activeDragId, closeTab]);

  const mainContent = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <EditorMosaic
        layout={mosaicLayout}
        onChange={setMosaicLayout}
        renderTile={renderTile}
      />
      
      <DragOverlay dropAnimation={null}>
        {activeDragId && tabRegistry[activeDragId] ? (
          <div className="flex items-center gap-2 px-3 h-[35px] bg-rd-tab-active text-rd-text-active border border-rd-focus-border opacity-80 shadow-xl pointer-events-none rounded-t-sm">
            <Icon name={tabRegistry[activeDragId].icon || (tabRegistry[activeDragId].type === 'terminal' ? 'terminal' : 'file')} size={14} />
            <span className="text-[13px] truncate max-w-[150px]">{tabRegistry[activeDragId].name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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

      {/* Premium Loading Overlay */}
      {!isAppLoaded && (
        <div className="fixed inset-0 z-[9999] bg-[#0b0e14] flex flex-col items-center justify-center transition-opacity duration-500">
          <div className="relative w-40 h-40 mb-12">
            <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-rd-focus-border animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-b-4 border-l-4 border-blue-500/30 animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={logo} 
                className="w-20 h-20 animate-heartbeat" 
                style={{ imageRendering: 'optimizeQuality' }}
                alt="RadiantCL1 Logo" 
              />
            </div>
          </div>
          <h2 className="text-xl font-light tracking-[0.2em] uppercase text-zinc-300 animate-pulse">
            <span className="font-bold text-rd-focus-border">RadiantCL1</span>
          </h2>
          <div className="mt-4 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-rd-focus-border to-transparent w-full animate-shimmer"></div>
          </div>
        </div>
      )}
    </DndProvider>
  );
}

export default App;
