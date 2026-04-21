import React, { useEffect, useRef, useState } from 'react';
import { Modal, ModalButton } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { useTranslation } from 'react-i18next';
import { ConnectionLogEntry } from '../../../hooks/useTerminalConnection';
import { cn } from '../../../lib/utils';

interface ConnectionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbort: () => void;
  onRetry: (savePreference: boolean) => void;
  hostName: string;
  hostId: number;
  entries: ConnectionLogEntry[];
  isConnecting: boolean;
}

export const ConnectionLogModal: React.FC<ConnectionLogModalProps> = ({
  isOpen,
  onClose,
  onAbort,
  onRetry,
  hostName,
  hostId,
  entries,
  isConnecting,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rememberPreference, setRememberPreference] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const hasError = entries.some(e => e.status === 'error' || e.status === 'aborted');
  const securityWarning = entries.find(e => e.step === 'security_warning');

  const handleRetry = () => {
    onRetry(rememberPreference);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isConnecting ? () => {} : onClose} // Prevent closing while connecting unless aborted
      title={t('modals.connectionLog')}
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          {isConnecting ? (
            <ModalButton variant="danger" onClick={onAbort}>
              {t('modals.abortConnection')}
            </ModalButton>
          ) : securityWarning ? (
            <div className="flex gap-2">
               <ModalButton variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </ModalButton>
              <ModalButton variant="primary" onClick={handleRetry}>
                {t('modals.authorizeAndConnect')}
              </ModalButton>
            </div>
          ) : (
            <ModalButton variant="primary" onClick={onClose}>
              {t('common.close')}
            </ModalButton>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-rd-text font-medium border-b border-rd-border pb-2">
          <Icon name="network" size={16} className="text-rd-accent" />
          <span>{hostName}</span>
          {isConnecting && (
            <div className="ml-auto flex items-center gap-2 text-[11px] text-rd-accent animate-pulse">
              <div className="w-1.5 h-1.5 bg-rd-accent rounded-full" />
              {t('modals.connecting')}
            </div>
          )}
        </div>

        <div 
          ref={scrollRef}
          className="bg-[#1e1e1e] border border-rd-border rounded p-3 font-mono text-[12px] h-64 overflow-y-auto flex flex-col gap-1.5 shadow-inner"
        >
          {entries.length === 0 && isConnecting && (
            <div className="text-zinc-500 italic">Initializing connection...</div>
          )}
          
          {entries.map((entry, idx) => (
            <div key={idx} className={cn(
              "flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300",
              entry.status === 'error' || entry.status === 'aborted' ? "text-red-400" : 
              entry.status === 'warning' ? "text-orange-400" :
              entry.status === 'success' ? "text-rd-text-dim" : "text-rd-accent"
            )}>
              <span className="shrink-0 mt-0.5">
                {entry.status === 'pending' ? (
                  <Icon name="loading" size={14} className="animate-spin" />
                ) : entry.status === 'success' ? (
                  <Icon name="check" size={14} className="text-green-500" />
                ) : entry.status === 'warning' ? (
                  <Icon name="alertTriangle" size={14} className="text-orange-500" />
                ) : (
                  <Icon name="close" size={14} className="text-red-500" />
                )}
              </span>
              <div className="flex flex-col">
                <span className="leading-tight">
                  {t(`modals.connectionSteps.${entry.step}`, { message: entry.message })}
                </span>
                {(entry.status === 'error' || entry.status === 'warning') && entry.message && (
                  <span className={cn(
                    "text-[10px] mt-1 p-1.5 border rounded",
                    entry.status === 'error' ? "bg-red-500/10 border-red-500/20" : "bg-orange-500/10 border-orange-500/20"
                  )}>
                    {entry.message}
                  </span>
                )}
              </div>
              <span className="ml-auto text-[10px] opacity-30 select-none">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))}
          
          {!isConnecting && !hasError && !securityWarning && entries.length > 0 && (
            <div className="text-green-500 flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
              <Icon name="check" size={14} />
              <span>{t('modals.connectionSteps.ready')}</span>
            </div>
          )}
        </div>

        {securityWarning && (
          <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded flex flex-col gap-3">
             <div className="flex items-center gap-3">
              <Icon name="alertTriangle" size={20} className="text-orange-500 shrink-0" />
              <div className="text-[12px] text-rd-text">
                <p className="font-bold">{t('modals.securityWarningTitle')}</p>
                <p className="opacity-80">{t('modals.securityWarningDesc', { message: securityWarning.message })}</p>
              </div>
            </div>
            
            {hostId > 0 && (
              <label className="flex items-center gap-2 text-[11px] text-rd-text-dim cursor-pointer hover:text-rd-text transition-colors">
                <input 
                  type="checkbox" 
                  checked={rememberPreference}
                  onChange={(e) => setRememberPreference(e.target.checked)}
                  className="rounded border-rd-border bg-rd-bg-lighter text-rd-accent focus:ring-rd-accent"
                />
                {t('modals.rememberSecurityPreference')}
              </label>
            )}
          </div>
        )}

        {hasError && !securityWarning && (
          <div className="bg-red-500/5 border border-red-500/10 p-3 rounded flex items-center gap-3">
            <Icon name="close" size={20} className="text-red-500 shrink-0" />
            <div className="text-[12px] text-rd-text">
              <p className="font-bold">{t('modals.connectionError')}</p>
              <p className="opacity-80">Check your network settings or credentials and try again.</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
