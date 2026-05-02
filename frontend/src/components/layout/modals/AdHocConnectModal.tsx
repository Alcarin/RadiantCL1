import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel, ModalSelect } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { db } from '../../../../wailsjs/go/models';
import { useTranslation } from 'react-i18next';
import { CredentialsService } from '../../../lib/credentials_service';
import { EventsEmit } from '../../../../wailsjs/runtime/runtime';

interface AdHocConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdHocConnectModal: React.FC<AdHocConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    address: '',
    type: 'ssh',
    port: 22,
    credentialId: 0,
    username: '',
    password: '',
  });

  const [credentials, setCredentials] = useState<db.Credential[]>([]);

  useEffect(() => {
    const loadCreds = async () => {
      const list = await CredentialsService.getCredentials();
      setCredentials(list || []);
    };
    if (isOpen) {
      loadCreds();
      // Reset form
      setFormData({
        address: '',
        type: 'ssh',
        port: 22,
        credentialId: 0,
        username: '',
        password: '',
      });
    }
  }, [isOpen]);

  const handleConnect = async () => {
    if (formData.address.trim()) {
      const sessionName = formData.address.trim();
      
      let user = formData.username;
      let pass = formData.password;

      if (formData.type === 'ssh' && formData.credentialId > 0) {
        const cred = credentials.find(c => c.id === formData.credentialId);
        if (cred) {
          user = cred.username;
          pass = await CredentialsService.getPassword(formData.credentialId);
        }
      }

      EventsEmit('app:connect', {
        hostId: 0,
        name: sessionName,
        icon: 'terminal',
        address: formData.address.trim(),
        port: Number(formData.port),
        type: formData.type,
        user,
        pass
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modals.adHocConnection')}
      width="max-w-md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={handleConnect} 
            disabled={!formData.address.trim()}
          >
            {t('common.connect')}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ModalLabel>{t('common.address')}</ModalLabel>
            <ModalInput
              autoFocus
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
              placeholder="192.168.1.1"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConnect();
                }
              }}
            />
          </div>

          <div>
            <ModalLabel>{t('common.protocol')}</ModalLabel>
            <ModalSelect
              value={formData.type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const type = e.target.value;
                setFormData({ 
                  ...formData, 
                  type,
                  port: type === 'ssh' ? 22 : 23
                });
              }}
            >
              <option value="ssh">SSH</option>
              <option value="telnet">Telnet</option>
            </ModalSelect>
          </div>

          <div>
            <ModalLabel>{t('common.port')}</ModalLabel>
            <ModalInput
              type="number"
              value={formData.port}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
            />
          </div>

          {formData.type === 'ssh' && (
            <div className="col-span-2 space-y-4">
              <div>
                <ModalLabel>{t('common.credentialProfile')}</ModalLabel>
                <ModalSelect
                  value={formData.credentialId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, credentialId: parseInt(e.target.value) })}
                >
                  <option value="0">{t('common.ask')}</option>
                  {credentials.map(c => (
                    <option key={c.id} value={c.id}>{c.label} ({c.username})</option>
                  ))}
                </ModalSelect>
              </div>

              {formData.credentialId === 0 && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <ModalLabel>{t('common.username')}</ModalLabel>
                    <ModalInput
                      value={formData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="root"
                    />
                  </div>
                  <div>
                    <ModalLabel>Password</ModalLabel>
                    <ModalInput
                      type="password"
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConnect();
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
