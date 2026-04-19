import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreferencesModal } from './PreferencesModal';
import { SettingsService } from '../../../lib/settings_service';
import i18n from '../../../i18n/config';
import React from 'react';
import { I18nextProvider } from 'react-i18next';

// Mock SettingsService
vi.mock('../../../lib/settings_service', () => ({
  SettingsService: {
    saveLanguage: vi.fn(() => Promise.resolve()),
    getProtocolStatus: vi.fn(() => Promise.resolve({ registered: false, pathMatch: false, currentPath: '', details: '' })),
  }
}));

const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>
  );
};

describe('PreferencesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    renderWithI18n(<PreferencesModal isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('changes language and saves on Save click', async () => {
    const onClose = vi.fn();
    renderWithI18n(<PreferencesModal isOpen={true} onClose={onClose} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'it' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(SettingsService.saveLanguage).toHaveBeenCalledWith('it');
      expect(i18n.language).toBe('it');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
