import React from 'react';
import { Icon, IconName } from '../ui/Icon';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ActivityBarItem {
  id: string;
  icon: IconName;
  label: string;
}

interface ActivityBarProps {
  activeId: string;
  onSelect: (id: string) => void;
  items: ActivityBarItem[];
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeId, onSelect, items }) => {
  const { t } = useTranslation();
  
  return (
    <div
      className="flex flex-col items-center bg-rd-activitybar border-r border-rd-border shrink-0 w-12"
      data-ui-chrome
    >
      {/* Primary nav icons */}
      <div className="flex flex-col items-center w-full pt-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'relative flex items-center justify-center w-full py-[10px] transition-colors focus:outline-none',
                isActive
                  ? 'text-rd-accent drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]'
                  : 'text-rd-text-dim hover:text-rd-text-active'
              )}
              title={item.label}
            >
              <Icon name={item.icon} size={20} />
              {/* Active indicator — white bar on the left, exactly like VS Code */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-rd-accent shadow-rd-glow rounded-r-full transition-all" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom icons — account & settings */}
      <div className="mt-auto flex flex-col items-center w-full pb-1">
        <button
          className="flex items-center justify-center w-full py-[10px] text-rd-text-dim hover:text-rd-text-active transition-colors focus:outline-none"
          title={t('common.account')}
        >
          <Icon name="activity" size={20} />
        </button>
        <button
          className="flex items-center justify-center w-full py-[10px] text-rd-text-dim hover:text-rd-text-active transition-colors focus:outline-none"
          title={t('common.preferences')}
        >
          <Icon name="settings" size={20} />
        </button>
      </div>
    </div>
  );
};
