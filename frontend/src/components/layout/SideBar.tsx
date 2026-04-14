import React from 'react';

interface SideBarProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const SideBar: React.FC<SideBarProps> = ({ title, children, actions }) => {
  return (
    <div className="flex flex-col h-full bg-rd-sidebar" data-ui-chrome>
      {/* Header — uppercase title, VS Code exact style */}
      <div
        className="flex items-center justify-between px-5 shrink-0 border-b border-rd-border"
        style={{ height: 'var(--spacing-sidebar-header)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-rd-text-dim truncate">
          {title}
        </span>
        <div className="flex items-center gap-0.5">
          {actions}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};
