import React, { useState } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => void;
  hostName: string;
  error?: string | null;
  isConnecting?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  hostName,
  error,
  isConnecting,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isConnecting) return;
    onLogin(username, password);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connessione a ${hostName}`}
      width="max-w-sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={isConnecting}>
            Annulla
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={() => handleLogin()} 
            disabled={!username.trim() || isConnecting}
          >
            {isConnecting ? 'Connessione...' : 'Connetti'}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-[12px] text-red-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Icon name="activity" size={13} />
              Errore di Connessione
            </div>
            {error}
          </div>
        )}

        <div>
          <ModalLabel>Username</ModalLabel>
          <ModalInput
            autoFocus
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="admin"
            disabled={isConnecting}
          />
        </div>
        <div>
          <ModalLabel>Password</ModalLabel>
          <ModalInput
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <input type="submit" className="hidden" />
      </form>
    </Modal>
  );
};
