package db

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *Manager {
	// Use in-memory database for testing
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	// Enable foreign key constraints
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		t.Fatalf("failed to enable foreign keys in test: %v", err)
	}

	m := &Manager{DB: db}
	if err := m.Migrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}
	return m
}

func TestHostsCRUD(t *testing.T) {
	m := setupTestDB(t)
	defer m.Close()

	// 1. Test Add Folder
	folderID, err := m.AddFolder(Folder{
		Label: "Test Folder",
		Icon: "folder",
	})
	if err != nil {
		t.Errorf("AddFolder failed: %v", err)
	}

	// 2. Test Add Host
	hostID, err := m.AddHost(Host{
		FolderID: &folderID,
		Label:    "Test Host",
		Address:  "127.0.0.1",
		Type:     "ssh",
		Port:     22,
	})
	if err != nil {
		t.Errorf("AddHost failed: %v", err)
	}

	// 3. Test Get Data
	data, err := m.GetTreeData()
	if err != nil {
		t.Errorf("GetTreeData failed: %v", err)
	}
	if len(data.Folders) != 1 || len(data.Hosts) != 1 {
		t.Errorf("Data length mismatch: folders=%d, hosts=%d", len(data.Folders), len(data.Hosts))
	}

	// 4. Test Update Folder
	err = m.UpdateFolder(Folder{
		ID:    folderID,
		Label: "Updated Folder",
		Icon:  "folder-open",
	})
	if err != nil {
		t.Errorf("UpdateFolder failed: %v", err)
	}

	// 5. Test Update Host
	err = m.UpdateHost(Host{
		ID:       hostID,
		FolderID: &folderID,
		Label:    "Updated Host",
		Address:  "192.168.1.1",
		Type:     "telnet",
		Port:     23,
	})
	if err != nil {
		t.Errorf("UpdateHost failed: %v", err)
	}

	// Verify updates
	data, _ = m.GetTreeData()
	if data.Folders[0].Label != "Updated Folder" {
		t.Errorf("Folder update failed, label: %s", data.Folders[0].Label)
	}
	if data.Hosts[0].Label != "Updated Host" {
		t.Errorf("Host update failed, label: %s", data.Hosts[0].Label)
	}

	// 6. Test Delete Host
	err = m.DeleteHost(hostID)
	if err != nil {
		t.Errorf("DeleteHost failed: %v", err)
	}
	data, _ = m.GetTreeData()
	if len(data.Hosts) != 0 {
		t.Errorf("Host deletion failed, count: %d", len(data.Hosts))
	}

	// 7. Test Delete Folder (Cascade)
	// Add another host first
	_, _ = m.AddHost(Host{FolderID: &folderID, Label: "Host to cascade", Address: "1.1.1.1", Type: "ssh", Port: 22})
	err = m.DeleteFolder(folderID)
	if err != nil {
		t.Errorf("DeleteFolder failed: %v", err)
	}
	data, _ = m.GetTreeData()
	if len(data.Folders) != 0 || len(data.Hosts) != 0 {
		t.Errorf("Folder cascade deletion failed: folders=%d, hosts=%d", len(data.Folders), len(data.Hosts))
	}
}
