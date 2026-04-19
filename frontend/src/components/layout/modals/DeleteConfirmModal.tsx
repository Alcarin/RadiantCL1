import React from 'react';
import { Modal, ModalButton } from '../../ui/Modal';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: 'folder' | 'host';
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton variant="danger" onClick={onConfirm}>
            {t('common.delete')}
          </ModalButton>
        </>
      }
    >
      <div className="text-[13px] text-rd-text">
        <p>
          {itemType === 'folder' 
            ? t('modals.deleteFolderConfirm', { name: itemName }) 
            : t('modals.deleteHostConfirm', { name: itemName })}
        </p>
        {itemType === 'folder' && (
          <p className="mt-2 text-[#f14c4c] text-[12px]">
            {t('modals.deleteFolderWarning')}
          </p>
        )}
      </div>
    </Modal>
  );
};
