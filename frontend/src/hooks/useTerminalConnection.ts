import { useState, useCallback, useEffect } from 'react';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { ConnectTerminal, AbortConnection } from '../../wailsjs/go/main/App';
import { useTranslation } from 'react-i18next';
import { IconName } from '../components/ui/Icon';

export interface ConnectionLogEntry {
  step: string;
  status: 'pending' | 'success' | 'error' | 'aborted';
  message?: string;
  timestamp: number;
}

export interface ConnectionState {
  isOpen: boolean;
  sessionId: string | null;
  hostName: string;
  hostId: number;
  icon: IconName;
  entries: ConnectionLogEntry[];
  isConnecting: boolean;
}

export const useTerminalConnection = (onConnectionSuccess: (data: { sessionId: string, name: string, hostId: number, icon: IconName }) => void) => {
  const { t } = useTranslation();
  const [state, setState] = useState<ConnectionState>({
    isOpen: false,
    sessionId: null,
    hostName: '',
    hostId: 0,
    icon: 'terminal',
    entries: [],
    isConnecting: false,
  });

  const connect = useCallback(async (hostId: number, name: string, icon: IconName, username: string = '', password: string = '') => {
    // Generiamo l'ID qui sul frontend per poter ascoltare gli eventi fin dal primo step
    const sessionId = `term-${hostId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    setState(prev => ({
      ...prev,
      isOpen: true,
      hostName: name,
      hostId: hostId,
      icon: icon,
      entries: [],
      isConnecting: true,
      sessionId: sessionId,
    }));

    try {
      await ConnectTerminal(sessionId, hostId, username, password);
    } catch (err) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        entries: [...prev.entries, {
          step: 'error',
          status: 'error',
          message: String(err),
          timestamp: Date.now()
        }]
      }));
    }
  }, []);

  const abort = useCallback(async () => {
    if (state.sessionId) {
      await AbortConnection(state.sessionId);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        entries: [...prev.entries, {
          step: 'aborted',
          status: 'aborted',
          timestamp: Date.now()
        }]
      }));
    } else {
      setState(prev => ({ ...prev, isOpen: false, isConnecting: false }));
    }
  }, [state.sessionId]);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!state.isOpen || !state.sessionId) return;

    const handleProgress = (data: any) => {
      if (data.id !== state.sessionId) return;

      const { step, message } = data;
      
      if (step === 'ready') {
        onConnectionSuccess({
          sessionId: state.sessionId!,
          name: state.hostName,
          hostId: state.hostId,
          icon: state.icon
        });
        setState(prev => ({ ...prev, isConnecting: false, isOpen: false }));
      } else if (step === 'error') {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          entries: [...prev.entries, {
            step: 'error',
            status: 'error',
            message: message,
            timestamp: Date.now()
          }]
        }));
      } else {
        setState(prev => {
          // If the step is already there, don't duplicate (though backend should only emit once)
          const exists = prev.entries.find(e => e.step === step);
          if (exists) return prev;

          const newEntries = [...prev.entries];
          // Mark previous as success if not error
          if (newEntries.length > 0) {
            const last = newEntries[newEntries.length - 1];
            if (last.status === 'pending') {
              last.status = 'success';
            }
          }

          return {
            ...prev,
            entries: [...newEntries, {
              step,
              status: 'pending',
              timestamp: Date.now()
            }]
          };
        });
      }
    };

    EventsOn('terminal:progress', handleProgress);
    return () => EventsOff('terminal:progress');
  }, [state.isOpen, state.sessionId, state.hostName, state.hostId, state.icon, onConnectionSuccess]);

  return {
    state,
    connect,
    abort,
    close
  };
};
