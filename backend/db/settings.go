package db

import (
	"database/sql"
	"fmt"
)

// GetSetting recupera il valore di un setting dalla tabella settings
func (m *Manager) GetSetting(key string) (string, error) {
	if m.DB == nil {
		return "", fmt.Errorf("database not initialized")
	}

	var value string
	err := m.DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil // Non trovato
	}
	if err != nil {
		return "", fmt.Errorf("failed to get setting '%s': %w", key, err)
	}

	return value, nil
}

// SaveSetting salva o aggiorna un setting nella tabella settings
func (m *Manager) SaveSetting(key string, value string) error {
	if m.DB == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
		INSERT INTO settings (key, value, updated_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET 
			value = excluded.value,
			updated_at = CURRENT_TIMESTAMP
	`
	
	_, err := m.DB.Exec(query, key, value)
	if err != nil {
		return fmt.Errorf("failed to save setting '%s': %w", key, err)
	}

	return nil
}
