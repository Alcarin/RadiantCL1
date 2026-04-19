import React, { useState, useEffect, useRef } from 'react';
import { Icon, IconName } from '../ui/Icon';
import { WindowMinimise, WindowToggleMaximise, Quit, Environment, EventsEmit } from '../../../wailsjs/runtime/runtime';
import { HostsService } from '../../lib/hosts_service';
import { TreeNode } from '../ui/TreeView';
import { CreditsModal } from './modals/CreditsModal';
import { PreferencesModal } from './modals/PreferencesModal';
import { ConnectTerminal } from '../../../wailsjs/go/main/App';
import { useTranslation } from 'react-i18next';

interface MenuBarProps {
  onOpenFile?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onOpenFile }) => {
  const [platform, setPlatform] = useState<string>('windows');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hosts, setHosts] = useState<TreeNode[]>([]);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Environment().then((info) => {
      setPlatform(info.platform);
    }).catch(err => {
      console.warn("Wails runtime not available in this context:", err);
    });

    const loadHosts = async () => {
      const tree = await HostsService.getHostsTree();
      setHosts(tree);
    };
    loadHosts();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimise = () => WindowMinimise();
  const handleToggleMaximise = () => WindowToggleMaximise();
  const handleClose = () => Quit();

  const isMac = platform === 'darwin';

  const handleConnect = async (node: TreeNode) => {
    if (node.id.startsWith('f-')) return;
    setActiveMenu(null); // Chiudi subito il menu per feedback istantaneo
    try {
      const hostId = HostsService.parseId(node.id);
      if (hostId === undefined) return;
      
      const sessionId = await ConnectTerminal(hostId, '', '');
      EventsEmit('app:open-terminal', { 
        sessionId, 
        name: node.label,
        hostId,
        icon: node.icon || 'terminal'
      });
    } catch (err) {
      console.error("Connection failed from menu:", err);
      // Se fallisce, emettiamo un evento per la ConnectionsView
      // così da innescare la logica di login esistente
      EventsEmit('app:request-login', node);
    }
  };

  const renderDropdownItem = (item: any) => {
    const hasChildren = item.submenu && item.submenu.length > 0;
    
    return (
      <div 
        key={item.label}
        className={`group relative flex items-center px-3 py-1.5 text-[12px] text-rd-text hover:bg-rd-list-hover cursor-default transition-colors ${item.separator ? 'border-t border-rd-border mt-1 pt-1' : ''}`}
        onClick={(e) => {
          if (!hasChildren && item.action) {
            e.stopPropagation();
            item.action();
          }
        }}
      >
        <div className="w-4 flex items-center justify-center mr-2">
          {item.icon && <Icon name={item.icon} size={14} className="text-rd-text-dim group-hover:text-rd-accent" />}
        </div>
        <span className="flex-1">{item.label}</span>
        {hasChildren && <Icon name="chevronRight" size={12} className="ml-2 opacity-50" />}
        
        {hasChildren && (
          <div className="hidden group-hover:block absolute left-full top-0 w-56 bg-rd-dropdown border border-rd-border shadow-2xl rounded-md py-1 z-[100] ml-[-1px]">
            {item.submenu.map((sub: any) => renderDropdownItem(sub))}
          </div>
        )}
      </div>
    );
  };

  const mapHostsToMenu = (nodes: TreeNode[]): any[] => {
    return nodes.map(node => ({
      label: node.label,
      icon: node.icon,
      submenu: node.children && node.children.length > 0 ? mapHostsToMenu(node.children) : undefined,
      action: !node.id.startsWith('f-') ? () => handleConnect(node) : undefined
    }));
  };

  const menuConfig = [
    {
      id: 'file',
      label: t('common.file'),
      items: [
        { label: t('common.openFile') || 'Open File...', icon: 'file' as IconName, action: () => { setActiveMenu(null); onOpenFile?.(); } },
        { separator: true, label: t('common.preferences'), icon: 'settings' as IconName, action: () => { setActiveMenu(null); setIsPreferencesOpen(true); } },
        { separator: true, label: t('common.exit') || 'Exit', icon: 'close' as IconName, action: () => handleClose() },
      ]
    },
    {
      id: 'connect',
      label: t('common.connect'),
      items: hosts.length > 0 ? mapHostsToMenu(hosts) : [{ label: t('common.noSavedHosts') || 'No saved hosts', disabled: true }]
    },
    {
      id: 'help',
      label: t('common.help') || 'Help',
      items: [
        { label: t('common.welcome') || 'Welcome', icon: 'terminal' as IconName, action: () => setActiveMenu(null) },
        { label: t('common.documentation') || 'Documentation', icon: 'file' as IconName, action: () => setActiveMenu(null) },
        { separator: true, label: t('common.credits') || 'Credits', icon: 'info' as IconName, action: () => { setActiveMenu(null); setIsCreditsOpen(true); } },
      ]
    }
  ];

  const renderWindowsControls = () => (
    <div className="flex items-stretch h-full no-drag ml-auto">
      <button onClick={handleMinimise} className="flex items-center justify-center w-[46px] hover:bg-white/10 transition-colors" title={t('common.minimize')}>
        <div className="w-3 h-[1px] bg-rd-text" />
      </button>
      <button onClick={handleToggleMaximise} className="flex items-center justify-center w-[46px] hover:bg-white/10 transition-colors" title={t('common.maximize')}>
        <div className="w-[9px] h-[9px] border border-rd-text" />
      </button>
      <button onClick={handleClose} className="flex items-center justify-center w-[46px] hover:bg-[#e81123] hover:text-white transition-colors group" title={t('common.close')}>
        <Icon name="close" size={16} className="text-rd-text group-hover:text-white" />
      </button>
    </div>
  );

  const renderMacControls = () => (
    <div className="flex items-center px-3 no-drag gap-2">
      <button onClick={handleClose} className="mac-control mac-control-close">
        <svg width="6" height="6" viewBox="0 0 6 6" fill="none"><path d="M1.17 1.17l3.66 3.66M4.83 1.17L1.17 4.83" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      </button>
      <button onClick={handleMinimise} className="mac-control mac-control-minimize">
        <svg width="6" height="1" viewBox="0 0 6 1" fill="none"><path d="M0 0.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      </button>
      <button onClick={handleToggleMaximise} className="mac-control mac-control-maximize">
        <svg width="6" height="6" viewBox="0 0 6 6" fill="none"><path d="M3 1v4M1 3h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      </button>
    </div>
  );

  return (
    <div
      onDoubleClick={handleToggleMaximise}
      className="flex items-center bg-rd-titlebar border-b border-rd-border shrink-0 select-none wails-drag"
      style={{ height: 'var(--spacing-menubar-height)' }}
      data-ui-chrome
      ref={menuRef}
    >
      {isMac ? renderMacControls() : (
        <div className="flex items-center justify-center w-[46px] shrink-0">
          <Icon name="terminal" size={16} className="text-rd-accent" />
        </div>
      )}

      <div className={`flex items-center gap-0.5 no-drag ${isMac ? 'ml-2' : ''}`}>
        {menuConfig.map((menu) => (
          <div key={menu.id} className="relative">
            <div
              className={`px-3 py-1 text-[11px] rounded-[3px] cursor-default transition-colors ${
                activeMenu === menu.id ? 'bg-rd-list-active text-rd-accent' : 'text-rd-text hover:bg-rd-list-hover'
              }`}
              onMouseDown={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
              onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            >
              {menu.label}
            </div>
            
            {activeMenu === menu.id && (
              <div className="absolute left-0 top-full mt-[1px] w-56 bg-rd-dropdown border border-rd-border shadow-2xl rounded-md py-1 z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
                {menu.items.map((item: any) => renderDropdownItem(item))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 text-center text-[10px] text-rd-text-dim uppercase tracking-[3px] truncate px-4 opacity-40">
        RadiantCL1
      </div>

      {!isMac && renderWindowsControls()}

      <CreditsModal isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
      <PreferencesModal isOpen={isPreferencesOpen} onClose={() => setIsPreferencesOpen(false)} />
    </div>
  );
};
