import React, { useState } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { useTranslation } from 'react-i18next';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string, savePassword: boolean) => void;
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
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savePassword, setSavePassword] = useState(true);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isConnecting) return;
    onLogin(username, password, savePassword);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modals.connectTo', { name: hostName })}
      width="max-w-sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={isConnecting}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={() => handleLogin()} 
            disabled={!username.trim() || isConnecting}
          >
            {isConnecting ? t('modals.connecting') : t('common.connect')}
          </ModalButton>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-[12px] text-red-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Icon name="activity" size={13} />
              {t('modals.connectionError')}
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

        <div className="flex items-center gap-2 pt-1 pb-2">
          <input 
            type="checkbox" 
            id="save-password"
            checked={savePassword}
            onChange={(e) => setSavePassword(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-rd-border bg-white/5 text-rd-accent focus:ring-rd-accent focus:ring-offset-0"
          />
          <label htmlFor="save-password" className="text-[12px] text-rd-text-dim cursor-pointer hover:text-rd-text transition-colors">
            {t('modals.rememberPassword')}
          </label>
        </div>

        <input type="submit" className="hidden" />
      </form>
    </Modal>
  );
};
