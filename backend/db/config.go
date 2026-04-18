package db

import (
	"os"
	"path/filepath"
)

// GetConfigDir returns the path to the RadiantCL1 configuration directory in the user's home.
func GetConfigDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	
	configDir := filepath.Join(home, ".RadiantCL1")
	
	// Ensure the directory exists
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		err = os.MkdirAll(configDir, 0755)
		if err != nil {
			return "", err
		}
	}
	
	return configDir, nil
}

// GetDatabasePath returns the absolute path to the SQLite database file.
func GetDatabasePath() (string, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "radiant.db"), nil
}
