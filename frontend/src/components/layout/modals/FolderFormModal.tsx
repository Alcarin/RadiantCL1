import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel } from '../../ui/Modal';

interface FolderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  initialLabel?: string;
  isEdit?: boolean;
}

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLabel = '',
  isEdit = false,
}) => {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
    }
  }, [isOpen, initialLabel]);

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim());
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifica Cartella' : 'Nuova Cartella'}
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Annulla
          </ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={!label.trim()}>
            Salva
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <ModalLabel>Nome Cartella</ModalLabel>
          <ModalInput
            autoFocus
            value={label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
            placeholder="es. Router Core"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSave()}
          />
        </div>
      </div>
    </Modal>
  );
};
