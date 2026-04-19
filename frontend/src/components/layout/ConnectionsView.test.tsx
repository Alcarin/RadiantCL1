import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConnectionsView } from './ConnectionsView';
import * as AppBindings from '../../../wailsjs/go/main/App';
import * as Runtime from '../../../wailsjs/runtime/runtime';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

// Mock dependecies that might cause issues in jsdom
vi.mock('../../lib/hosts_service', () => ({
  HostsService: {
    getHostsTree: vi.fn(() => Promise.resolve([])),
    getExpandedMap: vi.fn(() => ({})),
  }
}));

// Mock Arborist components as they rely on a lot of browser APIs
vi.mock('../ui/TreeView', () => ({
  TreeView: () => <div data-testid="tree-view">TreeView Mock</div>,
}));

vi.mock('../../../wailsjs/go/main/App', () => ({
  GetActiveConnections: vi.fn(),
  ConnectTerminal: vi.fn(),
}));

vi.mock('../../../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(() => () => {}),
  EventsOff: vi.fn(),
  EventsEmit: vi.fn(),
}));

const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>
  );
};

describe('ConnectionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carica le connessioni attive al montaggio', async () => {
    const mockConnections = [
      { id: '1', name: 'Host 1', host: '1.2.3.4', type: 'ssh', status: 'connected', icon: 'server' }
    ];
    
    vi.mocked(AppBindings.GetActiveConnections).mockResolvedValue(mockConnections);
    
    renderWithI18n(<ConnectionsView />);
    
    await waitFor(() => {
      expect(AppBindings.GetActiveConnections).toHaveBeenCalled();
    });
  });

  it('mostra il messaggio di nessuna connessione se la lista è vuota', async () => {
    vi.mocked(AppBindings.GetActiveConnections).mockResolvedValue([]);
    
    renderWithI18n(<ConnectionsView />);
    
    await waitFor(() => {
      expect(screen.getByText('No active connections')).toBeInTheDocument();
    });
  });

  it('si sottoscrive all\'evento di aggiornamento sessioni', async () => {
    renderWithI18n(<ConnectionsView />);
    
    expect(Runtime.EventsOn).toHaveBeenCalledWith('terminal:sessions-updated', expect.any(Function));
  });
});
