import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SendTerminalData, MarkTerminalReady, ResizeTerminal, ReplayTerminalLog } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff, EventsEmit } from '../../wailsjs/runtime/runtime';
import i18n from '../i18n/config';

interface TerminalInstance {
  term: XTerm;
  fitAddon: FitAddon;
  container: HTMLDivElement;
  disposableData?: { dispose: () => void };
  replayed?: boolean; // Flag per evitare replay multipli dello stesso file
}

class TerminalManager {
  private instances: Map<string, TerminalInstance> = new Map();

  getOrCreateInstance(sessionId: string, hostLabel?: string, logFile?: string): TerminalInstance {
    let instance = this.instances.get(sessionId);
    
    if (!instance) {
      console.log(`[TerminalManager] Creating new instance for ${sessionId}`);
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

      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      term.open(container);

      const disposableData = term.onData((data) => {
        // Se siamo in stato zombie, intercettiamo 'r' e 'q'
        if ((instance as any).zombieMarker) {
          const key = data.toLowerCase();
          if (key === 'r') {
            EventsEmit(`terminal:reconnect:${sessionId}`);
            return;
          }
          if (key === 'q') {
            EventsEmit(`terminal:close-tab:${sessionId}`);
            return;
          }
          // Ignoriamo altri tasti in stato zombie
          return;
        }

        SendTerminalData(sessionId, data).catch(err => {
          console.error("Failed to send terminal data:", err);
        });
      });

      term.onResize((size) => {
        ResizeTerminal(sessionId, size.cols, size.rows).catch(err => {
          // Questo errore è atteso per le sessioni Zombie, non logghiamolo come critico
        });
      });

      const onData = (data: string) => term.write(data);
      const onClose = () => {
        console.log(`[TerminalManager] Handling onClose for ${sessionId}`);
        if ((instance as any).zombieMarker) return;

        // Scriviamo il messaggio e usiamo la callback per garantire la sincronizzazione
        term.write(`\r\n\x1b[31m${i18n.t('terminal.connectionInterrupted')}\x1b[0m\r\n`, () => {
          // 1. Spostiamo il cursore di una riga per separare dal messaggio
          term.write('\r\n', () => {
            // 2. Registriamo il marker ESATTAMENTE qui (riga vuota sotto il messaggio)
            const marker = term.registerMarker(0);
            
            if (marker) {
              console.log(`[TerminalManager] Marker registered at line: ${marker.line} for ${sessionId}`);
              (instance as any).zombieMarker = marker;
              
              // 3. Creiamo le 4 righe di "respiro" richieste SOTTO il pulsante
              term.write('\r\n\r\n', () => {
                EventsEmit(`terminal:show-zombie-widget:${sessionId}`);
              });
            }
          });
        });
      };

      EventsOn(`terminal:data:${sessionId}`, onData);
      EventsOn(`terminal:closed:${sessionId}`, onClose);
      
      // Listener per il ritorno allo stato ready (riconnessione)
      EventsOn('terminal:progress', (data: any) => {
        if (data.id === sessionId && data.step === 'ready') {
          console.log(`[TerminalManager] Session ${sessionId} is ready again, forcing fit and focus`);
          
          // Reset dello stato zombie se presente
          if ((instance as any).zombieMarker) {
            console.log(`[TerminalManager] Cleaning up zombie state for ${sessionId}`);
            (instance as any).zombieMarker.dispose();
            delete (instance as any).zombieMarker;
            // Notifichiamo la UI di nascondere il widget
            EventsEmit(`terminal:show-zombie-widget:${sessionId}`);
          }

          // Sincronizziamo col backend
          MarkTerminalReady(sessionId).catch(() => {});
          // Forziamo il ricalcolo del layout
          setTimeout(() => {
            fitAddon.fit();
            term.focus();
          }, 100);
        }
      });

      instance = { term, fitAddon, container, disposableData, replayed: false };
      (instance as any).onCloseInternal = onClose; // Memorizziamo per trigger manuale
      this.instances.set(sessionId, instance);
    }

    // Se abbiamo i dati del log e non abbiamo ancora fatto il replay per questa istanza
    if (hostLabel && logFile && !instance.replayed) {
      console.log(`[TerminalManager] Requesting replay for ${sessionId} (file: ${logFile}, host: ${hostLabel})`);
      const currentInstance = instance;
      ReplayTerminalLog(sessionId, hostLabel, logFile).then(content => {
        if (content) {
          console.log(`[TerminalManager] Replay successful for ${sessionId}, writing ${content.length} chars`);
          currentInstance.term.write(content);
          currentInstance.replayed = true;
        } else {
          console.log(`[TerminalManager] Replay returned empty content for ${sessionId}`);
        }
      }).catch(err => {
        console.error(`[TerminalManager] Failed to replay log for ${sessionId}:`, err);
      });
    }

    return instance;
  }

  markReady(sessionId: string) {
    MarkTerminalReady(sessionId).catch(() => {});
    const instance = this.instances.get(sessionId);
    if (instance) {
      setTimeout(() => instance.fitAddon.fit(), 100);
    }
  }

  getInstance(sessionId: string) {
    return this.instances.get(sessionId);
  }



  triggerZombieWidget(sessionId: string) {
    const instance = this.instances.get(sessionId);
    if (instance) {
      console.log(`[TerminalManager] Triggering zombie widget for ${sessionId}`);
      (instance as any).onCloseInternal?.();
    }
  }

  removeInstance(sessionId: string) {
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.disposableData?.dispose();
      EventsOff(`terminal:data:${sessionId}`);
      EventsOff(`terminal:closed:${sessionId}`);
      instance.term.dispose();
      instance.container.remove();
      this.instances.delete(sessionId);
    }
  }
}

export const terminalManager = new TerminalManager();
