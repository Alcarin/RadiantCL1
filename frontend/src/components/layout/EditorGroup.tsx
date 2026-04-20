import React from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../ui/Icon';
import { Terminal } from '../ui/Terminal';
import { LogViewerContent } from './LogViewerContent';
import { cn } from '../../lib/utils';


interface Tab {
  id: string;
  name: string;
  type?: 'editor' | 'terminal' | 'log-viewer';
  sessionId?: string;
  isModified?: boolean;
  icon?: any; // IconName from TreeView/Icon
  logHost?: string;
  logFilename?: string;
}



interface EditorGroupProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  content: string;
  language?: string;
}

export const EditorGroup: React.FC<EditorGroupProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  content,
  language = 'text',
}) => {
  return (
    <div className="flex flex-col h-full bg-rd-base overflow-hidden">
      {/* ── Tab Bar ── */}
      <div
        className="flex bg-rd-tab-inactive overflow-x-auto shrink-0 select-none"
        style={{ height: 'var(--spacing-tab-height)' }}
        data-ui-chrome
      >
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              title={tab.name}
              className={cn(
                'group relative flex items-center gap-2 px-3 h-full cursor-pointer transition-colors min-w-[120px] max-w-[200px] border-r border-rd-border',
                isActive
                  ? 'bg-rd-tab-active text-rd-text-active'
                  : 'bg-rd-tab-inactive text-rd-text-dim hover:bg-rd-list-hover'
              )}
            >
              {/* Active tab indicator — top line, subtle */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-px bg-rd-focus-border" />
              )}

              {/* File/Terminal icon */}
              <Icon
                name={tab.icon || (tab.type === 'terminal' ? 'terminal' : tab.type === 'log-viewer' ? 'clock' : 'file')}
                size={14}
                className={cn(
                  isActive ? 'text-rd-text-active' : 'text-rd-text-dim',
                  (tab.type === 'terminal' || tab.type === 'log-viewer') && 'text-rd-accent'
                )}
              />


              {/* File name */}
              <span className="truncate text-[13px] flex-1">{tab.name}</span>

              {/* Close button — visible on hover or when active */}
              <div
                className={cn(
                  'p-0.5 rounded-[3px] transition-colors',
                  isActive
                    ? 'text-rd-text-dim hover:text-rd-text-active hover:bg-white/10'
                    : 'text-transparent group-hover:text-rd-text-dim group-hover:hover:text-rd-text-active group-hover:hover:bg-white/10'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                {tab.isModified ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-rd-text-active" />
                ) : (
                  <Icon name="close" size={14} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 relative">
        {/* Render all terminals but hide inactive ones to preserve state */}
        {tabs.filter(t => t.type === 'terminal').map(t => (
          <div 
            key={t.id} 
            className={cn(
              "absolute inset-0 w-full h-full",
              t.id === activeTabId ? "visible z-10" : "invisible z-0 pointer-events-none"
            )}
          >
            <Terminal sessionId={t.sessionId || ''} />
          </div>
        ))}

        {/* Render editor or log viewer if active tab is NOT a terminal */}
        {tabs.find(t => t.id === activeTabId)?.type === 'editor' && (
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={content}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
              wordWrap: 'on',
              padding: { top: 8 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderLineHighlight: 'line',
              lineHeight: 20,
              letterSpacing: 0.3,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            }}
          />
        )}

        {tabs.find(t => t.id === activeTabId)?.type === 'log-viewer' && (() => {
          const t = tabs.find(tab => tab.id === activeTabId);
          return (
            <LogViewerContent 
              key={t?.id}
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
