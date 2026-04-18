import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { SendTerminalData, ResizeTerminal, CloseTerminal, MarkTerminalReady } from '../../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';

interface TerminalProps {
  sessionId: string;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ sessionId, className }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Inizializza Xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
      theme: {
        background: '#1e1e1e', // rd-base
        foreground: '#cccccc',
        cursor: '#aeafad',
        selectionBackground: '#264f78',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Gestione input utente -> Go
    const disposableData = term.onData((data) => {
      SendTerminalData(sessionId, data).catch(err => {
        console.error("Failed to send terminal data:", err);
      });
    });

    const disposableResize = term.onResize((size) => {
      ResizeTerminal(sessionId, size.cols, size.rows).catch(err => {
        console.error("Failed to resize terminal:", err);
      });
    });

    // Gestione Go -> Terminal
    const dataHandler = (data: string) => {
      term.write(data);
    };
    EventsOn(`terminal:data:${sessionId}`, dataHandler);

    const closeHandler = () => {
      term.write('\r\n[Connessione chiusa dal server]\r\n');
    };
    EventsOn(`terminal:closed:${sessionId}`, closeHandler);

    // Initial resize and mark ready to receive data
    ResizeTerminal(sessionId, term.cols, term.rows);
    MarkTerminalReady(sessionId).catch(err => {
      console.error("Failed to mark terminal ready:", err);
    });

    // Gestione resize finestra
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
       fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      disposableData.dispose();
      disposableResize.dispose();
      EventsOff(`terminal:data:${sessionId}`);
      EventsOff(`terminal:closed:${sessionId}`);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [sessionId]);

  return (
    <div 
      ref={terminalRef} 
      className={`w-full h-full bg-[#1e1e1e] p-2 overflow-hidden ${className}`}
    />
  );
};
