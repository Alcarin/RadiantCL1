import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel, ModalSelect } from '../../ui/Modal';
import { Icon, IconName } from '../../ui/Icon';
import { db } from '../../../../wailsjs/go/models';
import { cn } from '../../../lib/utils';
import { CredentialsService } from '../../../lib/credentials_service';
import { useTranslation } from 'react-i18next';

interface HostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hostData: Partial<db.Host>) => void;
  initialData?: Partial<db.Host>;
  isEdit?: boolean;
  onOpenCredentials: () => void;
}

const AVAILABLE_ICONS: IconName[] = [
  'server',
  'computer',
  'laptop',
  'smartphone',
  'router',
  'network',
  'ethernetPort',
  'firewall',
  'shield',
  'database',
  'hardDrive',
  'cpu',
  'usb',
  'cable',
  'plug',
  'terminal',
  'activity',
  'wifi',
  'signal',
  'antenna',
  'satelliteDish',
  'globe',
  'cloud',
  'cloudSync',
  'keyRound',
  'lock', // Assuming lock exists
  'settings',
  'plus',
  'search',
  'waypoints',
  'layers',
  'bug',
  'rocket',
  'plane',
  'printer',
  'radio',
  'radioTower',
  'telescope',
  'thermometer',
  'expand',
  'shrink',
  'arrowDownUp',
  'arrowLeftRight',
  'squareChevronRight',
  'package'
];

export const HostFormModal: React.FC<HostFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEdit = false,
  onOpenCredentials,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<db.Host>>({
    label: '',
    address: '',
    type: 'ssh',
    port: 22,
    icon: 'server',
    credentialId: 0,
    ...initialData
  });

  const [credentials, setCredentials] = useState<db.Credential[]>([]);

  useEffect(() => {
    const loadCreds = async () => {
      const list = await CredentialsService.getCredentials();
      setCredentials(list || []);
    };
    if (isOpen) {
      loadCreds();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        label: '',
        address: '',
        type: 'ssh',
        port: 22,
        icon: 'server',
        credentialId: 0,
        ...initialData
      });
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (formData.label?.trim() && formData.address?.trim()) {
      onSave({
        ...formData,
        label: formData.label.trim(),
        address: formData.address.trim(),
        port: Number(formData.port),
        credentialId: formData.credentialId && formData.credentialId > 0 ? formData.credentialId : undefined
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('modals.editHost') : t('modals.newHost')}
      width="max-w-md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={handleSave} 
            disabled={!formData.label?.trim() || !formData.address?.trim()}
          >
            {t('common.save')}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ModalLabel>{t('common.hostName')}</ModalLabel>
            <ModalInput
              autoFocus
              value={formData.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, label: e.target.value })}
              placeholder="es. Router Core"
            />
          </div>
          
          <div className="col-span-2">
            <ModalLabel>{t('common.address')}</ModalLabel>
            <ModalInput
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
              placeholder="192.168.1.1"
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
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <ModalLabel className="mb-0">{t('common.credentialProfile')}</ModalLabel>
                <button 
                  type="button" 
                  onClick={onOpenCredentials}
                  className="text-[11px] text-rd-accent hover:underline flex items-center gap-1"
                >
                  <Icon name="settings" size={10} />
                  {t('common.manage')}
                </button>
              </div>
              <ModalSelect
                value={formData.credentialId || 0}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, credentialId: parseInt(e.target.value) })}
              >
                <option value="0">{t('common.askEveryTime') || 'Ask every time'}</option>
                {credentials.map(c => (
                  <option key={c.id} value={c.id}>{c.label} ({c.username})</option>
                ))}
              </ModalSelect>
            </div>
          )}

          {formData.type === 'ssh' && (
            <div className="col-span-2">
              <label className="flex items-start gap-2 cursor-pointer group mt-1">
                <input 
                  type="checkbox" 
                  checked={formData.allowDeprecated || false}
                  onChange={(e) => setFormData({ ...formData, allowDeprecated: e.target.checked })}
                  className="mt-1 rounded border-rd-border bg-rd-bg-lighter text-rd-accent focus:ring-rd-accent"
                />
                <div className="flex flex-col">
                  <span className="text-[12px] text-rd-text group-hover:text-rd-accent transition-colors">
                    {t('common.allowDeprecated')}
                  </span>
                  <span className="text-[10px] text-rd-text-dim">
                    {t('common.allowDeprecatedHelp')}
                  </span>
                </div>
              </label>
            </div>
          )}

          <div className="col-span-2">
            <ModalLabel>{t('common.icon')}</ModalLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {AVAILABLE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  title={icon}
                  className={cn(
                    "p-2 border transition-all",
                    formData.icon === icon 
                      ? "bg-rd-accent/20 border-rd-accent text-rd-accent shadow-[0_0_8px_rgba(253,224,71,0.4)]" 
                      : "bg-[#2d2d2d] border-transparent text-rd-text-dim hover:text-rd-text hover:bg-rd-list-hover"
                  )}
                >
                  <Icon name={icon} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
