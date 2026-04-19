package db

import (
	"fmt"
)

// Credential rappresenta un profilo di credenziali salvato.
type Credential struct {
	ID        int64  `json:"id"`
	Label     string `json:"label"`
	Username  string `json:"username"`
	Password  string `json:"password,omitempty"` // Usata solo per il passaggio dati temporaneo
	CreatedAt string `json:"createdAt"`
}

// GetCredentials recupera tutti i profili di credenziali.
func (m *Manager) GetCredentials() ([]Credential, error) {
	rows, err := m.DB.Query("SELECT id, label, username, created_at FROM credentials ORDER BY label ASC")
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %w", err)
	}
	defer rows.Close()

	var credentials []Credential
	for rows.Next() {
		var c Credential
		if err := rows.Scan(&c.ID, &c.Label, &c.Username, &c.CreatedAt); err != nil {
			return nil, err
		}
		credentials = append(credentials, c)
	}
	return credentials, nil
}

// GetCredentialByID recupera un profilo specifico.
func (m *Manager) GetCredentialByID(id int64) (Credential, error) {
	var c Credential
	err := m.DB.QueryRow("SELECT id, label, username, created_at FROM credentials WHERE id = ?", id).Scan(
		&c.ID, &c.Label, &c.Username, &c.CreatedAt)
	if err != nil {
		return c, fmt.Errorf("credential not found: %w", err)
	}
	return c, nil
}

// AddCredential inserisce un nuovo profilo.
func (m *Manager) AddCredential(c Credential) (int64, error) {
	res, err := m.DB.Exec("INSERT INTO credentials (label, username) VALUES (?, ?)",
		c.Label, c.Username)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateCredential aggiorna un profilo esistente.
func (m *Manager) UpdateCredential(c Credential) error {
	_, err := m.DB.Exec("UPDATE credentials SET label = ?, username = ? WHERE id = ?",
		c.Label, c.Username, c.ID)
	return err
}

// DeleteCredential rimuove un profilo.
func (m *Manager) DeleteCredential(id int64) error {
	_, err := m.DB.Exec("DELETE FROM credentials WHERE id = ?", id)
	return err
}
