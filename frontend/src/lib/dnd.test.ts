import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDndManager, initGlobalDnd } from './dnd';
import { MultiBackend } from 'react-dnd-multi-backend';

// Mock di dnd-core
vi.mock('dnd-core', () => ({
  createDragDropManager: vi.fn((factory, context, options) => {
    const manager = { mock: 'manager' };
    const backend = factory(manager, context, options);
    return {
      getBackend: () => backend,
      mockManager: true
    };
  })
}));

// Mock di MultiBackend con istanza costante ispezionabile
const physicalBackendMock = {
  setup: vi.fn(),
  teardown: vi.fn(),
  connectDragSource: vi.fn(),
  connectDropTarget: vi.fn(),
  connectDragPreview: vi.fn(),
  previewEnabled: vi.fn(),
  previewsList: vi.fn(),
  backendsList: vi.fn(),
};

vi.mock('react-dnd-multi-backend', () => ({
  MultiBackend: vi.fn(() => physicalBackendMock)
}));

// Mock di HTML5BackendImpl per testare lo scudo senza rompere i moduli reali
vi.mock('react-dnd-html5-backend/dist/HTML5BackendImpl', () => {
  class MockHTML5BackendImpl {
    rootElement: any = {};
    setup() {
      if (this.rootElement && this.rootElement.__isReactDndBackendSetUp) {
        throw new Error('Cannot have two HTML5 backends at the same time.');
      }
    }
  }
  return { HTML5BackendImpl: MockHTML5BackendImpl };
});

describe('DND Infrastructure - Technical Tests', () => {
  beforeEach(() => {
    delete (window as any).__RD_DND_MANAGER__;
    delete (window as any).__RD_SHIELD_ACTIVE__;
    const DND_INSTANCE_SYM = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');
    delete (window as any)[DND_INSTANCE_SYM];
    vi.clearAllMocks();
  });

  it('dovrebbe restituire un singleton del manager', () => {
    const m1 = getDndManager();
    const m2 = getDndManager();
    expect(m1).toBe(m2);
  });

  it('dovrebbe implementare correttamente il reference counting', () => {
    const manager = getDndManager();
    const backend = (manager as any).getBackend();
    
    backend.setup();
    expect(physicalBackendMock.setup).toHaveBeenCalledTimes(1);

    backend.setup(); // Ref: 2
    expect(physicalBackendMock.setup).toHaveBeenCalledTimes(1);

    backend.teardown(); // Ref: 1
    expect(physicalBackendMock.teardown).not.toHaveBeenCalled();

    backend.teardown(); // Ref: 0
    expect(physicalBackendMock.teardown).toHaveBeenCalledTimes(1);
  });

  it('dovrebbe delegare correttamente i metodi al backend fisico', () => {
    const manager = getDndManager();
    const backend = (manager as any).getBackend();
    
    backend.setup();
    backend.connectDragSource('node');
    expect(physicalBackendMock.connectDragSource).toHaveBeenCalledWith('node');
  });

  it('dovrebbe inizializzare il Global Context Bridge con il simbolo corretto', () => {
    initGlobalDnd();
    const symbol = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');
    expect((window as any)[symbol]).toBeDefined();
    expect((window as any)[symbol].dragDropManager).toBe(getDndManager());
  });

  it('dovrebbe intercettare i crash di setup multipli tramite lo scudo', () => {
    const manager = getDndManager();
    const backend = (manager as any).getBackend();

    // Simulazione di un backend fisico che crasha al secondo tentativo (scenario reale)
    physicalBackendMock.setup.mockImplementationOnce(() => {}); // 1
    physicalBackendMock.setup.mockImplementationOnce(() => {    // 2 (crasha)
        throw new Error('Cannot have two HTML5 backends at the same time.');
    });

    backend.setup();
    backend.teardown(); // Forziamo il teardown fisico così il prossimo setup() ripassa dal physicalBackendMock.setup()
    
    // Senza lo scudo in dnd.ts, questo lancerebbe un errore
    expect(() => backend.setup()).not.toThrow();
  });
});
