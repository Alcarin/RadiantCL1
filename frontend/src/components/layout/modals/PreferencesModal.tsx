import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalButton, ModalLabel, ModalSelect } from '../../ui/Modal';
import { SettingsService } from '../../../lib/settings_service';

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

  useEffect(() => {
    if (isOpen) {
      setCurrentLang(i18n.language);
    }
  }, [isOpen, i18n.language]);

  const handleSave = async () => {
    await i18n.changeLanguage(currentLang);
    await SettingsService.saveLanguage(currentLang);
    onClose();
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
      </div>
    </Modal>
  );
};
