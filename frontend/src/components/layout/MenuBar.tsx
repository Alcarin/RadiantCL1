import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { WindowMinimise, WindowToggleMaximise, Quit, Environment } from '../../../wailsjs/runtime/runtime';

export const MenuBar: React.FC = () => {
  const [platform, setPlatform] = useState<string>('windows');
  const menus = ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'];

  useEffect(() => {
    Environment().then((info) => {
      setPlatform(info.platform);
    }).catch(err => {
      console.warn("Wails runtime not available in this context:", err);
    });
  }, []);

  const handleMinimise = () => WindowMinimise();
  const handleToggleMaximise = () => WindowToggleMaximise();
  const handleClose = () => Quit();

  const isMac = platform === 'darwin';

  const renderWindowsControls = () => (
    <div className="flex items-stretch h-full no-drag ml-auto">
      <button
        onClick={handleMinimise}
        className="flex items-center justify-center w-[46px] hover:bg-white/10 transition-colors"
        title="Minimize"
      >
        <div className="w-3 h-[1px] bg-rd-text" />
      </button>
      <button
        onClick={handleToggleMaximise}
        className="flex items-center justify-center w-[46px] hover:bg-white/10 transition-colors"
        title="Maximize"
      >
        <div className="w-[9px] h-[9px] border border-rd-text" />
      </button>
      <button
        onClick={handleClose}
        className="flex items-center justify-center w-[46px] hover:bg-[#e81123] hover:text-white transition-colors group"
        title="Close"
      >
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
    >
      {/* ── Sezione Sinistra ── */}
      {isMac ? (
        renderMacControls()
      ) : (
        <div className="flex items-center justify-center w-[46px] shrink-0">
          <Icon name="terminal" size={16} className="text-rd-text" />
        </div>
      )}

      {/* ── Menu items (Sempre vicini ai controlli su Mac, a sinistra su Win) ── */}
      <div className={`flex items-center gap-0.5 no-drag ${isMac ? 'ml-2' : ''}`}>
        {menus.map((menu) => (
          <div
            key={menu}
            className="px-2 py-0.5 text-[11px] text-rd-text hover:bg-white/10 rounded-[3px] cursor-default transition-colors"
          >
            {menu}
          </div>
        ))}
      </div>

      {/* ── Titolo Centrale ── */}
      <div className="flex-1 text-center text-[11px] text-rd-text-dim truncate px-4">
        RadiantCL1
      </div>

      {/* ── Sezione Destra ── */}
      {!isMac && renderWindowsControls()}
    </div>
  );
};
