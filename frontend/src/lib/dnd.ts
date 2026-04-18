import { createDragDropManager, DragDropManager } from 'dnd-core';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';
// @ts-ignore - Accesso diretto al cuore del backend per la patch correttiva
import { HTML5BackendImpl } from 'react-dnd-html5-backend/dist/HTML5BackendImpl';

/**
 * Simbolo globale usato da react-dnd per identificare l'istanza singleton del contesto.
 */
const DND_INSTANCE_SYM = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');

/**
 * applyGlobalDndShield - Applica una patch al prototipo di HTML5BackendImpl.
 * Rende il metodo setup() idempotente, catturando l'errore "Cannot have two backends"
 * e permettendo alle librerie di coesistere sullo stesso bus di eventi.
 */
function applyGlobalDndShield() {
  if (typeof window === 'undefined' || (window as any).__RD_SHIELD_ACTIVE__) return;

  try {
    const proto = HTML5BackendImpl.prototype;
    if (proto && proto.setup) {
      const originalSetup = proto.setup;
      proto.setup = function() {
        try {
          originalSetup.call(this);
        } catch (e: any) {
          if (e.message && e.message.includes('Cannot have two HTML5 backends')) {
            // Silenziamo l'errore: il backend è già attivo sul rootElement
            return;
          }
          throw e;
        }
      };
      (window as any).__RD_SHIELD_ACTIVE__ = true;
      console.debug('DND: Global Shield attivato con successo.');
    }
  } catch (err) {
    console.error('DND: Impossibile applicare lo scudo globale:', err);
  }
}

/**
 * getDndManager - Restituisce un singleton del DragDropManager con architettura "RefCount".
 */
export function getDndManager(): DragDropManager {
  if (typeof window === 'undefined') return null as any;

  if (!(window as any).__RD_DND_MANAGER__) {
    let physicalBackend: any = null;
    let refCount = 0;

    const ProxiedBackendFactory = (manager: any, context: any, options: any) => {
      return {
        setup: () => {
          refCount++;
          if (refCount === 1) {
            if (!physicalBackend) {
              physicalBackend = MultiBackend(manager, context, options);
            }
            try {
              physicalBackend.setup();
            } catch (e: any) {
              if (e.message && e.message.includes('Cannot have two HTML5 backends')) {
                console.debug('DND: Setup fisico già attivo, ignorato.');
                return;
              }
              throw e;
            }
          }
        },
        teardown: () => {
          refCount--;
          if (refCount === 0) {
            if (physicalBackend) physicalBackend.teardown();
            physicalBackend = null;
          }
        },
        connectDragSource: (...args: any[]) => physicalBackend?.connectDragSource(...args),
        connectDragPreview: (...args: any[]) => physicalBackend?.connectDragPreview(...args),
        connectDropTarget: (...args: any[]) => physicalBackend?.connectDropTarget(...args),
        profile: () => physicalBackend?.profile?.(),
        previewEnabled: () => physicalBackend?.previewEnabled?.(),
        previewsList: () => physicalBackend?.previewsList?.(),
        backendsList: () => physicalBackend?.backendsList?.(),
      };
    };

    (window as any).__RD_DND_MANAGER__ = createDragDropManager(
      ProxiedBackendFactory,
      undefined,
      HTML5toTouch
    );
  }
  
  return (window as any).__RD_DND_MANAGER__;
}

/**
 * initGlobalDnd - Inzializza il sistema DND a livello globale per il progetto.
 */
export function initGlobalDnd() {
  if (typeof window === 'undefined') return;
  
  // Applichiamo la patch "chirurgica" ai backend per prevenire conflitti fatali
  applyGlobalDndShield();

  const manager = getDndManager();
  
  // Iniettiamo il manager nel simbolo globale di react-dnd
  (window as any)[DND_INSTANCE_SYM] = {
    dragDropManager: manager
  };
  
  console.log('DND: Global Context Bridge attivo.');
}
