import { GetSetting, SaveSetting, GetProtocolStatus, RegisterProtocolHandlers, UnregisterProtocolHandlers } from '../../wailsjs/go/main/App';
import { osutils } from '../../wailsjs/go/models';

export class SettingsService {
  /**
   * Recupera una preferenza dell'utente dal backend
   */
  static async getSetting(key: string): Promise<string> {
    try {
      return await GetSetting(key);
    } catch (err) {
      console.error(`Failed to get setting ${key}:`, err);
      return '';
    }
  }

  /**
   * Salva una preferenza dell'utente nel backend
   */
  static async saveSetting(key: string, value: string): Promise<void> {
    try {
      await SaveSetting(key, value);
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
    }
  }

  /**
   * Helper specifico per la lingua
   */
  static async getLanguage(): Promise<string> {
    const lang = await this.getSetting('language');
    return lang || 'en';
  }

  static async saveLanguage(lang: string): Promise<void> {
    await this.saveSetting('language', lang);
  }

  /**
   * Recupera lo stato dei protocolli OS
   */
  static async getProtocolStatus(): Promise<osutils.ProtocolStatus> {
    try {
      return await GetProtocolStatus();
    } catch (err) {
      console.error('Failed to get protocol status:', err);
      return { registered: false, pathMatch: false, currentPath: '', details: 'Errore recupero stato' };
    }
  }

  /**
   * Registra i protocolli nel sistema
   */
  static async registerProtocols(): Promise<void> {
    try {
      await RegisterProtocolHandlers();
    } catch (err) {
      console.error('Failed to register protocols:', err);
      throw err;
    }
  }

  /**
   * Rimuove la registrazione dei protocolli
   */
  static async unregisterProtocols(): Promise<void> {
    try {
      await UnregisterProtocolHandlers();
    } catch (err) {
      console.error('Failed to unregister protocols:', err);
      throw err;
    }
  }
}
