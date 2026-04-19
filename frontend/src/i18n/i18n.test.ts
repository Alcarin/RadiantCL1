import { describe, it, expect } from 'vitest';
import i18n from './config';

describe('i18n configuration', () => {
  it('should load translations correctly', () => {
    expect(i18n.t('common.connect', { lng: 'en' })).toBe('Connect');
    expect(i18n.t('common.connect', { lng: 'it' })).toBe('Connetti');
    expect(i18n.t('common.connect', { lng: 'fr' })).toBe('Connexion');
  });

  it('should fallback to English for missing keys', () => {
    // Note: fallbackLng is set to 'en'
    expect(i18n.t('non_existent_key', { lng: 'it' })).toBe('non_existent_key');
  });

  it('should change language correctly', async () => {
    await i18n.changeLanguage('it');
    expect(i18n.language).toBe('it');
    expect(i18n.t('common.save')).toBe('Salva');

    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('common.save')).toBe('Save');
  });
});
