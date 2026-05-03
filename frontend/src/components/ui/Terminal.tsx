import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { terminalManager } from '../../lib/terminalManager';
import { EventsOn, EventsEmit } from '../../../wailsjs/runtime/runtime';
import { IsSessionAlive } from '../../../wailsjs/go/main/App';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  hostName?: string;
  logFile?: string;
  className?: string;
  active?: boolean;
  onReconnect?: () => void;
  onClose?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ sessionId, hostName, logFile, className, active, onReconnect, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isDisconnected, setIsDisconnected] = React.useState(false);
  const { t } = useTranslation();

  if (!sessionId) {
    return <div className="w-full h-full flex items-center justify-center text-rd-text-dim italic">Terminal session lost</div>;
  }

  useEffect(() => {
    if (!terminalRef.current) return;
    
    const instance = terminalManager.getOrCreateInstance(sessionId, hostName, logFile);
    const { term, fitAddon, container } = instance;

    const checkStatus = async () => {
      try {
        const alive = await IsSessionAlive(sessionId);
        if (!alive) {
          setIsDisconnected(true);
          // Attiviamo il widget inline nel flusso di testo
          terminalManager.triggerZombieWidget(sessionId);
        }
      } catch (err) {
        setIsDisconnected(true);
        terminalManager.triggerZombieWidget(sessionId);
      }
    };
    checkStatus();

    console.log(`[Terminal] Attaching session ${sessionId} container to DOM`);
    
    // Teletrasporto DOM: appendiamo il div gestito dal manager
    terminalRef.current.appendChild(container);
    
    terminalManager.markReady(sessionId);
    
    // Fit e focus iniziale
    setTimeout(() => {
      fitAddon.fit();
      if (active) term.focus();
    }, 50);

    const handleResize = () => fitAddon.fit();
    const resizeObserver = new ResizeObserver(() => {
      if (terminalRef.current) fitAddon.fit();
    });
    
    resizeObserver.observe(terminalRef.current);
    window.addEventListener('resize', handleResize);

    const onClosed = () => {
      console.log(`[Terminal] Session ${sessionId} closed`);
      setIsDisconnected(true);
    };

    const offClosed = EventsOn(`terminal:closed:${sessionId}`, onClosed);

    // Al mount, resettiamo lo stato se il manager ha l'istanza (potrebbe essere stata riconnessa)
    setIsDisconnected(false);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      offClosed();
      // Rimuoviamo il container dal DOM di React, ma SENZA distruggerlo (rimane in TerminalManager)
      if (terminalRef.current && terminalRef.current.contains(container)) {
        terminalRef.current.removeChild(container);
      }
    };
  }, [sessionId, active, hostName, logFile, onReconnect, onClose]);

  return (
    <div className={cn("relative w-full h-full group/term", className)}>
      <div 
        ref={terminalRef} 
        className="w-full h-full bg-[#1e1e1e] p-2 overflow-hidden"
      />

      {/* Zombie Decoration: Sincronizzata nativamente da xterm.js */}
      <ZombieDecoration sessionId={sessionId} onReconnect={onReconnect} onClose={onClose} />
    </div>
  );
};

/**
 * Componente interno che usa le Decorations API di xterm.js per un
 * posizionamento perfetto nel buffer.
 */
const ZombieDecoration = ({ sessionId, onReconnect, onClose }: { sessionId: string, onReconnect?: () => void, onClose?: () => void }) => {
  const [marker, setMarker] = React.useState<any>(null);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    const checkMarker = () => {
      const instance = terminalManager.getInstance(sessionId);
      if (instance && (instance as any).zombieMarker) {
        setMarker((instance as any).zombieMarker);
      } else {
        setMarker(null);
      }
    };

    const offShow = EventsOn(`terminal:show-zombie-widget:${sessionId}`, checkMarker);
    
    // La tastiera simula il click del pulsante per garantire parità di comportamento
    const offRec = EventsOn(`terminal:reconnect:${sessionId}`, () => {
      setMarker(null);
      setContainer(null);
      onReconnect?.();
    });

    const offClose = EventsOn(`terminal:close-tab:${sessionId}`, () => {
      setMarker(null);
      setContainer(null);
      onClose?.();
    });

    checkMarker();

    const interval = setInterval(async () => {
      const alive = await IsSessionAlive(sessionId);
      if (alive) {
        setMarker(null);
        setContainer(null);
      }
    }, 1000);

    return () => {
      offShow();
      offRec();
      offClose();
      clearInterval(interval);
    };
  }, [sessionId]);

  React.useEffect(() => {
    if (!marker) return;

    const instance = terminalManager.getInstance(sessionId);
    if (!instance) return;

    const term = instance.term;
    
    const decoration = term.registerDecoration({
      marker,
      anchor: 'left',
      x: 4, 
      width: 1,
      height: 1
    });

    decoration?.onRender((el: HTMLElement) => {
      el.style.zIndex = '50';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      setContainer(el);
    });

    return () => {
      decoration?.dispose();
    };
  }, [marker, sessionId]);

  if (!container || !marker) return null;

  return createPortal(
    <button
      onClick={() => {
        setMarker(null);
        setContainer(null);
        onReconnect?.();
      }}
      className="flex items-center gap-2 px-4 py-1.5 bg-rd-accent text-rd-accent-fg hover:bg-rd-accent-hover rounded-md text-[10px] font-bold uppercase tracking-wider pointer-events-auto shadow-lg whitespace-nowrap"
      style={{ transform: 'translateY(-4px)' }}
    >
      <Icon name="terminal" size={12} />
      {t('terminal.reconnectSession')}
    </button>,
    container
  );
};
