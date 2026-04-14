import { useState } from 'react';
import { ChevronRight, ChevronDown, ListTree } from 'lucide-react';
import { main } from '../../wailsjs/go/models';

interface Props {
  node: main.ASTNode;
  defaultExpanded?: boolean;
}

export function ASTNodeView({ node, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="pl-3 border-l border-white/[0.06] my-px font-mono text-[12px] leading-[20px] text-rd-text">
      <div
        className={`flex items-center gap-1.5 py-px px-1.5 rounded-[2px] hover:bg-rd-list-hover transition-colors ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={12} className="text-rd-text-dim shrink-0" strokeWidth={1.5} />
          ) : (
            <ChevronRight size={12} className="text-rd-text-dim shrink-0" strokeWidth={1.5} />
          )
        ) : (
          <span className="w-3 shrink-0 inline-block" />
        )}

        <ListTree size={11} className="shrink-0" style={{ color: 'var(--color-rd-syn-type)' }} strokeWidth={1.5} />
        <span style={{ color: 'var(--color-rd-syn-keyword)' }} className="font-semibold">
          {node.type}
        </span>

        {node.value && node.value.trim() !== '' && (
          <>
            <span className="text-rd-text-dim mx-0.5">=</span>
            <span
              className="truncate max-w-[300px]"
              style={{ color: 'var(--color-rd-syn-string)' }}
              title={node.value}
            >
              "{node.value.replace(/\n/g, '\\n')}"
            </span>
          </>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="ml-0.5 mt-px">
          {node.children!.map((child, i) => (
            <ASTNodeView key={i} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
