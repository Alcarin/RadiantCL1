import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalButton, ModalLabel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { db } from '../../../../wailsjs/go/models';

export interface ProtocolRequestData {
  protocol: string;
  user: string;
  password?: string;
  host: string;
  port: number;
}

interface ProtocolConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProtocolRequestData | null;
  existingHost: db.Host | null;
  savedUsername: string;
  onConfirm: (useSaved: boolean) => void;
}

export const ProtocolConnectModal: React.FC<ProtocolConnectModalProps> = ({
  isOpen,
  onClose,
  data,
  existingHost,
  savedUsername,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!data || !existingHost) return null;

  const isUserMismatch = data.user && data.user !== savedUsername;
  const isPortMismatch = data.port !== existingHost.port;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modals.protocolRequest.title')}
      width="w-[450px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
          <div className="p-2 bg-amber-500/20 rounded-full text-amber-500">
            <Icon name="alertTriangle" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-200">
              {t('modals.protocolRequest.hostFound', { address: data.host })}
            </p>
            <p className="text-xs text-amber-200/60 mt-1">
              {existingHost.label} ({existingHost.type.toUpperCase()})
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {isUserMismatch && (
            <div className="flex items-center gap-3 text-xs bg-white/5 p-3 rounded border border-white/10">
              <Icon name="info" size={14} className="text-white/40" />
              <span>
                {t('modals.protocolRequest.credentialMismatch', { 
                  linkUser: data.user, 
                  savedUser: savedUsername || t('common.none') 
                })}
              </span>
            </div>
          )}

          {isPortMismatch && (
            <div className="flex items-center gap-3 text-xs bg-white/5 p-3 rounded border border-white/10">
              <Icon name="settings" size={14} className="text-white/40" />
              <span>
                {t('modals.protocolRequest.differentPort', { 
                  linkPort: data.port, 
                  savedPort: existingHost.port 
                })}
              </span>
            </div>
          )}

          <p className="text-sm text-white/70 px-1 pt-2">
            {t('modals.protocolRequest.askCredential')}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <ModalButton 
            variant="primary" 
            onClick={() => onConfirm(true)}
            className="justify-start gap-3 h-12"
          >
            <Icon name="shield" size={16} />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('modals.protocolRequest.useSaved')}</div>
              <div className="text-[10px] opacity-60">
                {savedUsername ? `${savedUsername}@${data.host}` : data.host}
              </div>
            </div>
          </ModalButton>

          <ModalButton 
            variant="secondary" 
            onClick={() => onConfirm(false)}
            className="justify-start gap-3 h-12"
          >
            <Icon name="terminal" size={16} />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('modals.protocolRequest.useLink')}</div>
              <div className="text-[10px] opacity-60">
                {data.user ? `${data.user}@${data.host}` : data.host}
                {isPortMismatch && `:${data.port}`}
              </div>
            </div>
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
};
