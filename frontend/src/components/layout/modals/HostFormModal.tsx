import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel, ModalSelect } from '../../ui/Modal';
import { Icon, IconName } from '../../ui/Icon';
import { db } from '../../../../wailsjs/go/models';
import { cn } from '../../../lib/utils';

interface HostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hostData: Partial<db.Host>) => void;
  initialData?: Partial<db.Host>;
  isEdit?: boolean;
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
}) => {
  const [formData, setFormData] = useState<Partial<db.Host>>({
    label: '',
    address: '',
    type: 'ssh',
    port: 22,
    icon: 'server',
    ...initialData
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        label: '',
        address: '',
        type: 'ssh',
        port: 22,
        icon: 'server',
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
        port: Number(formData.port)
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifica Host' : 'Nuovo Host'}
      width="max-w-md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Annulla
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={handleSave} 
            disabled={!formData.label?.trim() || !formData.address?.trim()}
          >
            Salva
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ModalLabel>Nome Host</ModalLabel>
            <ModalInput
              autoFocus
              value={formData.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, label: e.target.value })}
              placeholder="es. Router Core"
            />
          </div>
          
          <div className="col-span-2">
            <ModalLabel>Indirizzo (IP o FQDN)</ModalLabel>
            <ModalInput
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
              placeholder="192.168.1.1"
            />
          </div>

          <div>
            <ModalLabel>Protocollo</ModalLabel>
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
            <ModalLabel>Porta</ModalLabel>
            <ModalInput
              type="number"
              value={formData.port}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="col-span-2">
            <ModalLabel>Icona</ModalLabel>
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
                      ? "bg-rd-accent/20 border-rd-accent text-rd-text-active shadow-[0_0_8px_rgba(0,122,204,0.4)]" 
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
