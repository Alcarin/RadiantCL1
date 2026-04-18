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

// GetBinDir returns the path to the directory where embedded binaries are extracted.
func GetBinDir() (string, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	binDir := filepath.Join(dir, "bin")
	if _, err := os.Stat(binDir); os.IsNotExist(err) {
		err = os.MkdirAll(binDir, 0755)
		if err != nil {
			return "", err
		}
	}
	return binDir, nil
}

// GetLogDir returns the path to the log directory for a specific host.
func GetLogDir(hostLabel string) (string, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	// Sanitize hostLabel to be a valid folder name
	logDir := filepath.Join(dir, "hosts", hostLabel, "log")
	if _, err := os.Stat(logDir); os.IsNotExist(err) {
		err = os.MkdirAll(logDir, 0755)
		if err != nil {
			return "", err
		}
	}
	return logDir, nil
}

// GetDatabasePath returns the absolute path to the SQLite database file.
func GetDatabasePath() (string, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "radiant.db"), nil
}
