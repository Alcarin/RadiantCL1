import React from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../ui/Icon';
import { Terminal } from '../ui/Terminal';
import { LogViewerContent } from './LogViewerContent';
import { FileEditorContent } from './FileEditorContent';
import { cn } from '../../lib/utils';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

interface Tab {
  id: string;
  name: string;
  type?: 'editor' | 'terminal' | 'log-viewer';
  sessionId?: string;
  isModified?: boolean;
  icon?: any;
  logHost?: string;
  logFilename?: string;
  logFile?: string;
}

interface EditorGroupProps {
  groupId: string;
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onReconnect?: (id: string) => void;
  content: string;
  language?: string;
  isDragging?: boolean; // Iniettato da App.tsx per sapere se è in corso un drag
  onFocus?: () => void;
  isFocused?: boolean;
}

// ─── DropZone sui bordi del gruppo per lo split ─────────────────────────────
const SplitDropZone: React.FC<{ id: string; position: 'top' | 'bottom' | 'left' | 'right'; isDragging: boolean }> = ({ id, position, isDragging }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const positionClass = {
    top: 'top-[var(--spacing-tab-height)] left-0 right-0 h-1/5',
    bottom: 'bottom-0 left-0 right-0 h-1/5',
    left: 'left-0 top-[var(--spacing-tab-height)] bottom-0 w-1/5',
    right: 'right-0 top-[var(--spacing-tab-height)] bottom-0 w-1/5',
  }[position];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute z-30 transition-all duration-150',
        positionClass,
        // Visibile solo durante drag, interattivo solo durante drag
        isDragging ? 'pointer-events-auto' : 'pointer-events-none opacity-0',
        isOver
          ? 'bg-rd-accent/25 border-2 border-rd-accent opacity-100'
          : isDragging ? 'opacity-0 hover:opacity-100' : 'opacity-0'
      )}
    />
  );
};

const GroupDropZone: React.FC<{ id: string; isDragging: boolean }> = ({ id, isDragging }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute inset-0 z-20 transition-all duration-150 pointer-events-none',
        isDragging && 'pointer-events-auto',
        isOver && 'bg-rd-accent/5 border-2 border-dashed border-rd-accent/30 opacity-100'
      )}
    />
  );
};

// ─── Singola scheda sortable ─────────────────────────────────────────────────
const SortableTab: React.FC<{
  tab: Tab;
  isActive: boolean;
  isFocused: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}> = ({ tab, isActive, isFocused, onSelect, onClose }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(tab.id)}
      title={tab.name}
      className={cn(
        'group relative flex items-center gap-2 px-3 h-full cursor-pointer transition-colors min-w-[120px] max-w-[200px] border-r border-rd-border select-none',
        isActive
          ? 'bg-rd-tab-active text-rd-text-active'
          : 'bg-rd-tab-inactive text-rd-text-dim hover:bg-rd-list-hover'
      )}
    >
      {/* Indicatore scheda attiva — linea in alto (solo se il gruppo è focalizzato) */}
      {isActive && isFocused && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-rd-focus-border shadow-[0_0_15px_rgba(201,168,76,0.8),0_0_5px_rgba(201,168,76,1)] z-20" />
      )}

      <Icon
        name={tab.icon || (tab.type === 'terminal' ? 'terminal' : tab.type === 'log-viewer' ? 'clock' : 'file')}
        size={14}
        className={cn(
          isActive ? (isFocused ? 'text-rd-text-active' : 'text-zinc-400') : 'text-rd-text-dim',
          (tab.type === 'terminal' || tab.type === 'log-viewer') && (isFocused ? 'text-rd-accent' : 'text-rd-accent/60')
        )}
      />

      <span className="truncate text-[13px] flex-1">{tab.name}</span>

      {/* Pulsante chiudi */}
      <div
        className={cn(
          'p-0.5 rounded-[3px] transition-colors',
          isActive
            ? 'text-rd-text-dim hover:text-rd-text-active hover:bg-white/10'
            : 'text-transparent group-hover:text-rd-text-dim group-hover:hover:text-rd-text-active group-hover:hover:bg-white/10'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
        onPointerDown={(e) => e.stopPropagation()} // Non innescare il drag
      >
        {tab.isModified ? (
          <div className="w-2.5 h-2.5 rounded-full bg-rd-text-active" />
        ) : (
          <Icon name="close" size={14} />
        )}
      </div>
    </div>
  );
};

// ─── EditorGroup principale ──────────────────────────────────────────────────
export const EditorGroup: React.FC<EditorGroupProps> = ({
  groupId,
  tabs,
  activeTabId: activeTabIdProp,
  onTabSelect,
  onTabClose,
  onReconnect,
  content,
  language = 'text',
  isDragging = false,
  onFocus,
  isFocused,
}) => {
  const activeTabId = activeTabIdProp || (tabs.length > 0 ? tabs[0].id : '');
  
  // Se la scheda attiva non è tra quelle del gruppo, forziamo la prima disponibile
  const effectiveActiveTabId = tabs.some(t => t.id === activeTabId) 
    ? activeTabId 
    : (tabs.length > 0 ? tabs[0].id : '');

  return (
    // Il wrapper è `relative` per contenere le DropZone di split
    <div 
      className="flex flex-col h-full bg-rd-base overflow-hidden relative"
      onMouseDownCapture={onFocus}
    >

      {/* ── DropZone di drag & drop (visibili solo durante il trascinamento) ── */}
      {isDragging && (
        <>
          <GroupDropZone id={`group-${groupId}`} isDragging={true} />
          <SplitDropZone id={`split-top-${groupId}`}    position="top"    isDragging={true} />
          <SplitDropZone id={`split-bottom-${groupId}`} position="bottom" isDragging={true} />
          <SplitDropZone id={`split-left-${groupId}`}   position="left"   isDragging={true} />
          <SplitDropZone id={`split-right-${groupId}`}  position="right"  isDragging={true} />
        </>
      )}

      {/* ── Tab Bar ── */}
      <div
        className="flex bg-rd-base overflow-x-auto shrink-0 select-none border-b border-rd-border-subtle pt-[3px]"
        style={{ height: 'var(--spacing-tab-height)' }}
        data-ui-chrome
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={effectiveActiveTabId === tab.id}
              isFocused={isFocused || false}
              onSelect={onTabSelect}
              onClose={onTabClose}
            />
          ))}
        </SortableContext>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 relative">
        {/* Terminali: tutti montati, solo quello attivo è visibile (preserva stato) */}
        {tabs.filter(t => t.type === 'terminal').map(t => (
          <div
            key={t.id}
            className={cn(
              'absolute inset-0 w-full h-full',
              t.id === effectiveActiveTabId ? 'visible z-10' : 'invisible z-0 pointer-events-none'
            )}
          >
            <Terminal 
              sessionId={t.sessionId || ''} 
              hostName={t.logHost || t.name} 
              logFile={t.logFile} 
              active={t.id === effectiveActiveTabId} 
              onReconnect={() => onReconnect?.(t.id)}
              onClose={() => onTabClose(t.id)}
            />
          </div>
        ))}

        {/* Editor Monaco */}
        {tabs.find(t => t.id === effectiveActiveTabId)?.type === 'editor' && (
          <FileEditorContent
            key={`editor-content-${effectiveActiveTabId}`}
            tabId={effectiveActiveTabId}
            content={content}
            language={language}
          />
        )}

        {/* Log Viewer */}
        {tabs.find(t => t.id === effectiveActiveTabId)?.type === 'log-viewer' && (() => {
          const t = tabs.find(tab => tab.id === effectiveActiveTabId);
          return (
            <LogViewerContent
              key={`log-${groupId}-${t?.id}`}
              content={content}
              tabId={t?.id || ''}
              host={t?.logHost || ''}
              filename={t?.logFilename || ''}
            />
          );
        })()}
      </div>
    </div>
  );
};
