import React, { useState } from 'react';
import { Icon, IconName } from './Icon';
import { cn } from '../../lib/utils';

export interface TreeNode {
  id: string;
  label: string;
  icon?: IconName;
  children?: TreeNode[];
  data?: any;
}

interface TreeViewProps {
  nodes: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  indent?: number;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  onSelect,
  selectedId,
  indent = 0,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col">
      {nodes.map((node) => {
        const isExpanded = expanded[node.id];
        const isSelected = selectedId === node.id;
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.id} className="flex flex-col">
            {/* Node row */}
            <div
              onClick={() => {
                if (hasChildren) {
                  setExpanded((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }
                onSelect?.(node);
              }}
              className={cn(
                'group relative flex items-center h-[22px] pr-2 cursor-pointer select-none transition-colors',
                isSelected
                  ? 'bg-rd-list-focus text-rd-text-active'
                  : 'hover:bg-rd-list-hover text-rd-text'
              )}
              style={{ paddingLeft: `${indent * 8 + 12}px` }}
            >
              {/* Indentation guides */}
              {indent > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 pointer-events-none"
                  aria-hidden
                >
                  {Array.from({ length: indent }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                      style={{ left: `${i * 8 + 20}px` }}
                    />
                  ))}
                </div>
              )}

              {/* Expand/collapse chevron */}
              <div
                className={cn(
                  'w-4 h-4 flex items-center justify-center shrink-0 transition-transform',
                  !hasChildren && 'invisible'
                )}
                onClick={(e) => toggleExpand(node.id, e)}
              >
                <Icon
                  name={isExpanded ? 'chevronDown' : 'chevronRight'}
                  size={10}
                />
              </div>

              {/* Icon + label */}
              <div className="flex items-center gap-1.5 min-w-0">
                {node.icon && (
                  <Icon name={node.icon} size={14} className="shrink-0 text-rd-text-dim" />
                )}
                {!node.icon && hasChildren && (
                  <Icon
                    name={isExpanded ? 'folderOpen' : 'folder'}
                    size={14}
                    className="shrink-0 text-[#dcb67a]"
                  />
                )}
                {!node.icon && !hasChildren && (
                  <Icon name="file" size={14} className="shrink-0 text-rd-text-dim" />
                )}
                <span className="truncate text-[13px] leading-[22px]">
                  {node.label}
                </span>
              </div>
            </div>

            {/* Children (recursive) */}
            {hasChildren && isExpanded && (
              <TreeView
                nodes={node.children!}
                onSelect={onSelect}
                selectedId={selectedId}
                indent={indent + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
