import React from 'react';
import { Icon } from '../ui/Icon';
import { useTranslation } from 'react-i18next';

export const StatusBar: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div
      className="flex items-center justify-between px-2.5 bg-rd-statusbar text-rd-statusbar-fg text-[12px] shrink-0 select-none"
      style={{ height: 'var(--spacing-statusbar-height)' }}
      data-ui-chrome
    >
      {/* Left cluster */}
      <div className="flex items-center h-full">
        <StatusItem>
          <Icon name="git" size={12} />
          <span>{t('common.mainBranch')}</span>
        </StatusItem>
        <StatusItem>
          <Icon name="activity" size={12} />
          <span>{t('common.connected')}</span>
        </StatusItem>
      </div>

      {/* Right cluster */}
      <div className="flex items-center h-full">
        <StatusItem>{t('common.spaces')}</StatusItem>
        <StatusItem>{t('common.encoding')}</StatusItem>
        <StatusItem>
          <Icon name="cpu" size={12} />
          <span>{t('common.ciscoIos')}</span>
        </StatusItem>
      </div>
    </div>
  );
};

/** Singolo item della status bar con hover state unificato */
const StatusItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-1 h-full px-1.5 cursor-default hover:bg-white/15 transition-colors">
    {children}
  </div>
);
