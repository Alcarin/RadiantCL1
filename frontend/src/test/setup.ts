import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Wails runtime
vi.mock('../../wailsjs/go/main/App', () => ({
  GetTreeData: vi.fn(),
  AddFolder: vi.fn(),
  AddHost: vi.fn(),
  ToggleFolderExpanded: vi.fn(),
  UpdateFolder: vi.fn(),
  DeleteFolder: vi.fn(),
  UpdateHost: vi.fn(),
  DeleteHost: vi.fn(),
  GetActiveConnections: vi.fn(),
  ConnectTerminal: vi.fn(),
}));

// Mock Wails runtime
vi.mock('../../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(),
  EventsOff: vi.fn(),
  EventsEmit: vi.fn(),
}));
