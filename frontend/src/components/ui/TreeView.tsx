import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Tree, NodeRendererProps, TreeApi } from 'react-arborist';
import { Icon, IconName } from './Icon';
import { cn } from '../../lib/utils';

export interface TreeNode {
  id: string;
  label: string;
  icon?: IconName;
  status?: string;
  children?: TreeNode[];
  data?: any;
}

interface TreeViewProps {
  nodes: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  expandedIds?: Record<string, boolean>;
  initialOpenState?: Record<string, boolean>;
  onToggleExpand?: (id: string, expanded: boolean) => void;
  renderNodeActions?: (node: TreeNode) => React.ReactNode;
  onMove?: (args: { dragIds: string[]; parentId: string | null; index: number }) => void;
  onNodeDoubleClick?: (node: TreeNode) => void;
  onNodeContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
  isSortable?: boolean;
  className?: string;
  showGuides?: boolean;
  disableDropInto?: boolean;
}

export interface TreeViewHandle {
  tree: TreeApi<TreeNode> | null;
}

interface NodeRendererExtraProps extends NodeRendererProps<TreeNode> {
  renderNodeActions?: (node: TreeNode) => React.ReactNode;
  onNodeDoubleClick?: (node: TreeNode) => void;
  onNodeContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
  showGuides?: boolean;
}

const NodeRenderer = ({ node, style, dragHandle, tree, renderNodeActions, onNodeDoubleClick, onNodeContextMenu, showGuides }: NodeRendererExtraProps) => {
  const isFolder = node.data.id.startsWith('f-') || (node.data.children && node.data.children.length > 0);
  const hasChildren = node.data.children && node.data.children.length > 0;
  const isSelected = node.isSelected;
  const isExpanded = node.isOpen;
  const indent = node.level;

  const finalShowGuides = showGuides !== false;

  return (
    <div
      ref={dragHandle}
      style={style}
      data-testid={`tree-node-${node.data.id}`}
      className={cn(
        'group relative flex items-center h-[22px] pr-2 cursor-pointer select-none transition-colors justify-between outline-none',
        isSelected
          ? 'bg-rd-list-focus text-rd-list-focus-fg shadow-inner'
          : 'hover:bg-rd-list-hover text-rd-text',
        node.isDragging && 'opacity-50 grayscale-[0.5]',
        node.willReceiveDrop && 'bg-rd-accent/10 ring-1 ring-inset ring-rd-accent/30'
      )}
      onClick={(e) => {
        node.select();
      }}
      onDoubleClick={(e) => {
        if (onNodeDoubleClick) {
          onNodeDoubleClick(node.data);
        } else {
          node.toggle();
        }
      }}
      onContextMenu={(e) => {
        if (onNodeContextMenu) {
          onNodeContextMenu(e, node.data);
        }
      }}
    >
      <div className="flex items-center min-w-0 pointer-events-none">
        {/* Indentation guides */}
        {finalShowGuides && indent > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none"
            aria-hidden
          >
            {Array.from({ length: indent }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                style={{ left: `${i * 12 + 20}px` }}
              />
            ))}
          </div>
        )}

        {/* Padding for depth */}
        <div style={{ width: indent * 12 }} className="shrink-0" />

        {/* Expand/collapse chevron */}
        <div
          data-testid={`chevron-${node.data.id}`}
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0 transition-transform pointer-events-auto',
            !isFolder && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
        >
          <Icon
            name={isExpanded ? 'chevronDown' : 'chevronRight'}
            size={10}
          />
        </div>

        {/* Icon + label */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative shrink-0">
            {node.data.icon ? (
              <Icon 
                name={node.data.icon} 
                size={14} 
                className={cn(
                  node.data.status === 'disconnected' 
                    ? 'text-rd-text-dim opacity-60' 
                    : 'text-rd-accent'
                )} 
              />
            ) : isFolder ? (
              <Icon
                name={isExpanded ? 'folderOpen' : 'folder'}
                size={14}
                className="text-[#dcb67a]"
              />
            ) : (
              <Icon name="file" size={14} className="text-rd-accent opacity-80" />
            )}
            
            {/* Status indicator (optional) */}
            {node.data.status === 'connected' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-rd-sidebar shadow-[0_0_5px_theme(colors.green.500)]" />
            )}
            {node.data.status === 'disconnected' && (
              <div className="absolute -bottom-1 -right-1 bg-rd-sidebar rounded-full flex items-center justify-center">
                <Icon name="close" size={10} strokeWidth={3} className="text-red-500" />
              </div>
            )}
            {node.data.status === 'connecting' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-500 border border-rd-sidebar animate-pulse shadow-[0_0_5px_theme(colors.yellow.500)]" />
            )}
          </div>
          <span className={cn(
            "truncate text-[13px] leading-[22px]",
            node.data.status === 'disconnected' && "text-rd-text-dim italic opacity-80"
          )}>
            {node.data.label}
          </span>
        </div>
      </div>

      {/* Node Actions (visible on hover) */}
      <div 
        className="hidden group-hover:flex items-center gap-0.5 ml-2 shrink-0 pr-1 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {renderNodeActions?.(node.data)}
      </div>
    </div>
  );
};

/**
 * Cursore di drop personalizzato per Arborist.
 * Sostituisce la linea blu predefinita con il tema Radiant Gold.
 */
const TreeCursor = ({ top, left, indent }: { top: number; left: number; indent: number }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    top: top - 2 + 'px',
    left: left + 'px',
    right: indent + 'px',
    display: 'flex',
    alignItems: 'center',
    zIndex: 10,
  };

  const circleStyle: React.CSSProperties = {
    width: '4px',
    height: '4px',
    boxShadow: '0 0 0 3px var(--color-rd-accent)',
    borderRadius: '50%',
  };

  const lineStyle: React.CSSProperties = {
    flex: 1,
    height: '2px',
    background: 'var(--color-rd-accent)',
    borderRadius: '1px',
  };

  return (
    <div style={style}>
      <div style={circleStyle} />
      <div style={lineStyle} />
    </div>
  );
};

export const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(({
  nodes,
  onSelect,
  selectedId,
  expandedIds,
  onToggleExpand,
  renderNodeActions,
  onMove,
  isSortable = true,
  className,
  showGuides = true,
  disableDropInto = false,
  initialOpenState,
  onNodeDoubleClick,
  onNodeContextMenu,
}, ref) => {
  const treeRef = useRef<TreeApi<TreeNode>>(null);

  useImperativeHandle(ref, () => ({
    tree: treeRef.current
  }));

  const handleSelect = (nodes: any[]) => {
    if (nodes.length > 0 && onSelect) {
      onSelect(nodes[0].data);
    }
  };

  const handleToggle = (id: string) => {
    const node = treeRef.current?.get(id);
    if (node) {
      // Arborist calls onToggle AFTER it changed internal state if managed
      onToggleExpand?.(id, node.isOpen);
    }
  };

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <Tree
        ref={treeRef}
        data={nodes}
        initialOpenState={initialOpenState}
        openByDefault={false}
        width="100%"
        height={nodes.length * 22 + (disableDropInto ? 0 : 100)} // Allow some scroll space if needed
        rowHeight={22}
        indent={12}
        padding={0}
        selection={selectedId}
        onSelect={handleSelect}
        onToggle={handleToggle}
        onMove={onMove}
        disableDrag={!isSortable}
        disableDrop={!isSortable}
        renderCursor={TreeCursor}
      >
        {(props) => (
          <NodeRenderer 
            {...props} 
            renderNodeActions={renderNodeActions} 
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            showGuides={showGuides} 
          />
        )}
      </Tree>
    </div>
  );
});

TreeView.displayName = 'TreeView';
