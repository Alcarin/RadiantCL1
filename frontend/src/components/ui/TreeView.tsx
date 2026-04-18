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
  isSortable?: boolean;
  className?: string;
  showGuides?: boolean;
  disableDropInto?: boolean;
  dndManager?: any;
}

export interface TreeViewHandle {
  tree: TreeApi<TreeNode> | null;
}

interface NodeRendererExtraProps extends NodeRendererProps<TreeNode> {
  renderNodeActions?: (node: TreeNode) => React.ReactNode;
  showGuides?: boolean;
}

const NodeRenderer = ({ node, style, dragHandle, tree, renderNodeActions, showGuides }: NodeRendererExtraProps) => {
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
          ? 'bg-rd-list-focus text-rd-text-active'
          : 'hover:bg-rd-list-hover text-rd-text',
        node.isDragging && 'opacity-50 grayscale-[0.5]',
        node.willReceiveDrop && 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/30'
      )}
      onClick={(e) => {
        node.select();
      }}
      onDoubleClick={() => node.toggle()}
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
              <Icon name={node.data.icon} size={14} className="text-rd-text-dim" />
            ) : isFolder ? (
              <Icon
                name={isExpanded ? 'folderOpen' : 'folder'}
                size={14}
                className="text-[#dcb67a]"
              />
            ) : (
              <Icon name="file" size={14} className="text-rd-text-dim" />
            )}
            
            {/* Status indicator (optional) */}
            {node.data.status === 'connected' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-rd-bg-main" />
            )}
            {node.data.status === 'connecting' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-500 border border-rd-bg-main animate-pulse" />
            )}
          </div>
          <span className="truncate text-[13px] leading-[22px]">
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
  dndManager,
  initialOpenState,
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
    <div className={cn("flex flex-col h-full w-full", className)}>
      <Tree
        ref={treeRef}
        data={nodes}
        dndManager={dndManager}
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
      >
        {(props) => (
          <NodeRenderer 
            {...props} 
            renderNodeActions={renderNodeActions} 
            showGuides={showGuides} 
          />
        )}
      </Tree>
    </div>
  );
});

TreeView.displayName = 'TreeView';
