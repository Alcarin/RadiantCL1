import { createDragDropManager, DragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Singleton instance to avoid multiple backend errors
let manager: DragDropManager | null = null;

export const getDndManager = (): DragDropManager => {
  if (!manager) {
    manager = createDragDropManager(HTML5Backend);
  }
  return manager;
};
