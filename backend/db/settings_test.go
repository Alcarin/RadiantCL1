package db

import (
	"testing"
)

func TestSettingsCRUD(t *testing.T) {
	m := setupTestDB(t)
	defer m.Close()

	// 1. Test Get non-existent setting
	val, err := m.GetSetting("non_existent")
	if err != nil {
		t.Errorf("GetSetting failed: %v", err)
	}
	if val != "" {
		t.Errorf("Expected empty string for non-existent setting, got: %s", val)
	}

	// 2. Test Save new setting
	err = m.SaveSetting("language", "it")
	if err != nil {
		t.Errorf("SaveSetting failed: %v", err)
	}

	// 3. Test Get saved setting
	val, err = m.GetSetting("language")
	if err != nil {
		t.Errorf("GetSetting failed: %v", err)
	}
	if val != "it" {
		t.Errorf("Expected 'it', got: %s", val)
	}

	// 4. Test Update setting
	err = m.SaveSetting("language", "fr")
	if err != nil {
		t.Errorf("SaveSetting update failed: %v", err)
	}

	val, err = m.GetSetting("language")
	if err != nil {
		t.Errorf("GetSetting after update failed: %v", err)
	}
	if val != "fr" {
		t.Errorf("Expected 'fr', got: %s", val)
	}
}
