import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';

interface SideBarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export const SideBarSection: React.FC<SideBarSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  actions,
  className,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("flex flex-col group", className)}>

      {/* Section Header */}
      <div 
        className="flex items-center h-[22px] px-1 hover:bg-rd-list-hover cursor-pointer text-rd-text-dim group-hover:text-rd-text transition-colors mt-0.5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn(
          "transition-transform duration-75",
          !expanded && "-rotate-90"
        )}>
          <Icon name="chevronDown" size={14} className="mr-0.5" />
        </div>
        <span className="text-[11px] font-bold tracking-wide uppercase flex-1 truncate">
          {title}
        </span>
        <div 
          className="hidden group-hover:flex items-center gap-0.5 px-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      </div>

      {/* Section Content */}
      {expanded && (
        <div className={cn(
          "flex flex-col overflow-hidden",
          className?.includes('flex-1') && "flex-1"
        )}>
          {children}
        </div>
      )}

    </div>
  );
};
