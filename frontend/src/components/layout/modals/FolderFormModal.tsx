import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel } from '../../ui/Modal';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      title={isEdit ? t('modals.editFolder') : t('modals.newFolder')}
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={!label.trim()}>
            {t('common.save')}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <ModalLabel>{t('common.folderName') || 'Folder Name'}</ModalLabel>
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
