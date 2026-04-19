import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from './settings_service';
import * as AppBindings from '../../wailsjs/go/main/App';

// Mock Wails bindings
vi.mock('../../wailsjs/go/main/App', () => ({
  GetSetting: vi.fn(),
  SaveSetting: vi.fn(),
}));

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLanguage should call GetSetting with "language"', async () => {
    vi.mocked(AppBindings.GetSetting).mockResolvedValue('it');
    const lang = await SettingsService.getLanguage();
    expect(AppBindings.GetSetting).toHaveBeenCalledWith('language');
    expect(lang).toBe('it');
  });

  it('saveLanguage should call SaveSetting with "language" and value', async () => {
    vi.mocked(AppBindings.SaveSetting).mockResolvedValue(undefined as any);
    await SettingsService.saveLanguage('fr');
    expect(AppBindings.SaveSetting).toHaveBeenCalledWith('language', 'fr');
  });
});
