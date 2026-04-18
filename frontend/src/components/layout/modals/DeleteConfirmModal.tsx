import React from 'react';
import { Modal, ModalButton } from '../../ui/Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Annulla
          </ModalButton>
          <ModalButton variant="danger" onClick={onConfirm}>
            Elimina
          </ModalButton>
        </>
      }
    >
      <div className="text-[13px] text-rd-text">
        <p>Sei sicuro di voler eliminare {itemType === 'folder' ? 'la cartella' : "l'host"} <strong>"{itemName}"</strong>?</p>
        {itemType === 'folder' && (
          <p className="mt-2 text-[#f14c4c] text-[12px]">
            Questa azione eliminerà permanentemente tutti gli host e le sottocartelle in essa contenuti.
          </p>
        )}
      </div>
    </Modal>
  );
};
