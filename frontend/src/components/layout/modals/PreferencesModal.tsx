import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalButton, ModalLabel, ModalSelect } from '../../ui/Modal';
import { SettingsService } from '../../../lib/settings_service';
import { Icon } from '../../ui/Icon';
import { osutils } from '../../../../wailsjs/go/models';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
];

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [protocolStatus, setProtocolStatus] = useState<osutils.ProtocolStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    const status = await SettingsService.getProtocolStatus();
    setProtocolStatus(status);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentLang(i18n.language);
      fetchStatus();
    }
  }, [isOpen, i18n.language]);

  const handleSave = async () => {
    await i18n.changeLanguage(currentLang);
    await SettingsService.saveLanguage(currentLang);
    onClose();
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await SettingsService.registerProtocols();
      await fetchStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregister = async () => {
    setIsLoading(true);
    try {
      await SettingsService.unregisterProtocols();
      await fetchStatus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.preferences')}
      width="max-w-sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton variant="primary" onClick={handleSave}>
            {t('common.save')}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div>
          <ModalLabel>{t('common.language')}</ModalLabel>
          <ModalSelect
            value={currentLang}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentLang(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </ModalSelect>
        </div>

        <div className="pt-2 border-t border-white/10 mt-4">
          <ModalLabel>{t('common.osIntegration')}</ModalLabel>
          <p className="text-xs text-white/50 mb-3">
            {t('common.osIntegrationDesc')}
          </p>
          
          <div className="bg-white/5 rounded-lg p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${
                  !protocolStatus?.registered ? 'bg-white/10 text-white/40' :
                  !protocolStatus?.pathMatch ? 'bg-amber-500/20 text-amber-500' :
                  'bg-emerald-500/20 text-emerald-500'
                }`}>
                  <Icon name={!protocolStatus?.registered ? 'shieldOff' : !protocolStatus?.pathMatch ? 'alertTriangle' : 'shieldCheck'} size={14} />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {t('common.protocolHandlers')}
                  </div>
                  <div className={`text-[11px] ${
                    !protocolStatus?.registered ? 'text-white/40' :
                    !protocolStatus?.pathMatch ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>
                    {!protocolStatus?.registered ? t('common.protocolsNotRegistered') :
                     !protocolStatus?.pathMatch ? t('common.protocolsPathMismatch') :
                     t('common.protocolsActive')}
                  </div>
                </div>
              </div>

              {protocolStatus?.registered && protocolStatus?.pathMatch && (
                <button
                  onClick={handleUnregister}
                  disabled={isLoading}
                  className="p-2 text-white/40 hover:text-red-400 transition-colors"
                  title={t('common.unregisterProtocols')}
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>

            {(!protocolStatus?.registered || !protocolStatus?.pathMatch) && (
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                ) : (
                  <Icon name={!protocolStatus?.registered ? 'plus' : 'refreshCw'} size={14} />
                )}
                {!protocolStatus?.registered ? t('common.registerProtocols') : t('common.updatePath')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
