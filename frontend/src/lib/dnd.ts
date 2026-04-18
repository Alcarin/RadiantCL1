import { createDragDropManager, DragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';

/**
 * SafeHTML5Backend - Un proxy che impedisce il crash se il backend è già inizializzato.
 * Questo risolve i conflitti tra diverse librerie (Arborist, Mosaic) che tentano 
 * di registrare il proprio provider.
 */
const SafeHTML5Backend = (manager: any, context: any, options: any) => {
  const backend = HTML5Backend(manager, context, options);
  const originalSetup = backend.setup;
  backend.setup = () => {
    try {
      originalSetup.call(backend);
    } catch (e: any) {
      if (e.message && e.message.includes('Cannot have two HTML5 backends')) {
        // Silently ignore, we are sharing the backend instance or listeners
        console.warn('DND: HTML5Backend already initialized, sharing instance.');
      } else {
        throw e;
      }
    }
  };
  return backend;
};

export function getDndManager(): DragDropManager {
  if (typeof window === 'undefined') return null as any;

  // Utilizziamo un singleton persistente su window per sopravvivere all'HMR di Vite
  if (!(window as any).__RD_DND_MANAGER__) {
    // Passiamo il SafeHTML5Backend invece di quello originale
    (window as any).__RD_DND_MANAGER__ = createDragDropManager(SafeHTML5Backend);
  }
  
  return (window as any).__RD_DND_MANAGER__;
}
