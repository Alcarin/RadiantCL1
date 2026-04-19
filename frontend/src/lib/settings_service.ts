import { GetSetting, SaveSetting } from '../../wailsjs/go/main/App';

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
}
