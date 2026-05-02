package db

import (
	"database/sql"
	"fmt"
)

// Folder represents a folder in the tree.
type Folder struct {
	ID         int64  `json:"id"`
	ParentID   *int64 `json:"parentId"`
	Label      string `json:"label"`
	Icon       string `json:"icon"`
	IsExpanded bool   `json:"isExpanded"`
	SortOrder  int    `json:"sortOrder"`
}

// Host represents a terminal host in the tree.
type Host struct {
	ID           int64  `json:"id"`
	FolderID     *int64 `json:"folderId"`
	CredentialID *int64 `json:"credentialId"`
	Label        string `json:"label"`
	Icon         string `json:"icon"`
	Address      string `json:"address"`
	Type         string `json:"type"`
	Port         int    `json:"port"`
	SortOrder    int    `json:"sortOrder"`
	AllowDeprecated bool `json:"allowDeprecated"`
}

// TreeData is a container for both folders and hosts.
type TreeData struct {
	Folders []Folder `json:"folders"`
	Hosts   []Host   `json:"hosts"`
}

// GetTreeData retrieves all folders and hosts from the database.
func (m *Manager) GetTreeData() (TreeData, error) {
	data := TreeData{
		Folders: []Folder{},
		Hosts:   []Host{},
	}

	// Fetch Folders
	rowsF, err := m.DB.Query("SELECT id, parent_id, label, icon, is_expanded, sort_order FROM folders ORDER BY sort_order ASC")
	if err != nil {
		return data, fmt.Errorf("failed to query folders: %w", err)
	}
	defer rowsF.Close()
	for rowsF.Next() {
		var f Folder
		var pid *int64
		if err := rowsF.Scan(&f.ID, &pid, &f.Label, &f.Icon, &f.IsExpanded, &f.SortOrder); err != nil {
			return data, err
		}
		f.ParentID = pid
		data.Folders = append(data.Folders, f)
	}

	// Fetch Hosts
	rowsH, err := m.DB.Query("SELECT id, folder_id, credential_id, label, icon, address, type, port, sort_order, allow_deprecated FROM hosts ORDER BY sort_order ASC")
	if err != nil {
		return data, fmt.Errorf("failed to query hosts: %w", err)
	}
	defer rowsH.Close()
	for rowsH.Next() {
		var h Host
		var fid, cid *int64
		if err := rowsH.Scan(&h.ID, &fid, &cid, &h.Label, &h.Icon, &h.Address, &h.Type, &h.Port, &h.SortOrder, &h.AllowDeprecated); err != nil {
			return data, err
		}
		h.FolderID = fid
		h.CredentialID = cid
		data.Hosts = append(data.Hosts, h)
	}

	return data, nil
}

// SetFolderExpanded updates the expanded state of a folder.
func (m *Manager) SetFolderExpanded(id int64, expanded bool) error {
	_, err := m.DB.Exec("UPDATE folders SET is_expanded = ? WHERE id = ?", expanded, id)
	return err
}

// SetAllFoldersExpanded updates the expanded state of all folders.
func (m *Manager) SetAllFoldersExpanded(expanded bool) error {
	_, err := m.DB.Exec("UPDATE folders SET is_expanded = ?", expanded)
	return err
}

// AddFolder inserts a new folder.
func (m *Manager) AddFolder(f Folder) (int64, error) {
	res, err := m.DB.Exec("INSERT INTO folders (parent_id, label, icon, is_expanded, sort_order) VALUES (?, ?, ?, ?, ?)",
		f.ParentID, f.Label, f.Icon, f.IsExpanded, f.SortOrder)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// AddHost inserts a new host.
func (m *Manager) AddHost(h Host) (int64, error) {
	res, err := m.DB.Exec("INSERT INTO hosts (folder_id, credential_id, label, icon, address, type, port, sort_order, allow_deprecated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		h.FolderID, h.CredentialID, h.Label, h.Icon, h.Address, h.Type, h.Port, h.SortOrder, h.AllowDeprecated)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateFolder updates an existing folder.
func (m *Manager) UpdateFolder(f Folder) error {
	_, err := m.DB.Exec("UPDATE folders SET parent_id = ?, label = ?, icon = ?, is_expanded = ?, sort_order = ? WHERE id = ?",
		f.ParentID, f.Label, f.Icon, f.IsExpanded, f.SortOrder, f.ID)
	return err
}

// DeleteFolder deletes a folder by ID (cascades to hosts and subfolders due to DB constraints).
func (m *Manager) DeleteFolder(id int64) error {
	_, err := m.DB.Exec("DELETE FROM folders WHERE id = ?", id)
	return err
}

// UpdateHost updates an existing host.
func (m *Manager) UpdateHost(h Host) error {
	_, err := m.DB.Exec("UPDATE hosts SET folder_id = ?, credential_id = ?, label = ?, icon = ?, address = ?, type = ?, port = ?, sort_order = ?, allow_deprecated = ? WHERE id = ?",
		h.FolderID, h.CredentialID, h.Label, h.Icon, h.Address, h.Type, h.Port, h.SortOrder, h.AllowDeprecated, h.ID)
	return err
}

// SetHostAllowDeprecated updates only the allow_deprecated field for a host.
func (m *Manager) SetHostAllowDeprecated(id int64, allow bool) error {
	_, err := m.DB.Exec("UPDATE hosts SET allow_deprecated = ? WHERE id = ?", allow, id)
	return err
}

// DeleteHost deletes a host by ID.
func (m *Manager) DeleteHost(id int64) error {
	_, err := m.DB.Exec("DELETE FROM hosts WHERE id = ?", id)
	return err
}

// siblingItem is a helper structure for sorting.
type siblingItem struct {
	id  int64
	typ string // "folder" or "host"
}

// reorderParent fetches all children, optionally removes one, optionally inserts one, and saves their updated sort_orders.
func (m *Manager) reorderParent(tx *sql.Tx, parentID *int64, skipID int64, skipTyp string, insertItem *siblingItem, insertIndex int) error {
	var items []siblingItem

	query := `
		SELECT id, 'folder' as typ, sort_order FROM folders WHERE parent_id IS ?
		UNION ALL
		SELECT id, 'host' as typ, sort_order FROM hosts WHERE folder_id IS ?
		ORDER BY sort_order ASC
	`
	rows, err := tx.Query(query, parentID, parentID)
	if err != nil {
		return err
	}

	for rows.Next() {
		var it siblingItem
		var so int
		if err := rows.Scan(&it.id, &it.typ, &so); err == nil {
			if it.id == skipID && it.typ == skipTyp {
				continue // Skip the moved item from the current reading
			}
			items = append(items, it)
		}
	}
	rows.Close()

	// Insert the new item if specified
	if insertItem != nil {
		if insertIndex < 0 {
			insertIndex = 0
		}
		if insertIndex > len(items) {
			insertIndex = len(items)
		}

		// Insert via slice append
		items = append(items[:insertIndex], append([]siblingItem{*insertItem}, items[insertIndex:]...)...)
	}

	// Persist the new exact ordering, starting strictly from 0
	for i, it := range items {
		if it.typ == "folder" {
			_, err = tx.Exec("UPDATE folders SET parent_id = ?, sort_order = ? WHERE id = ?", parentID, i, it.id)
		} else {
			_, err = tx.Exec("UPDATE hosts SET folder_id = ?, sort_order = ? WHERE id = ?", parentID, i, it.id)
		}
		if err != nil {
			return err
		}
	}

	return nil
}

// moveItem universally handles moving a folder or a host.
func (m *Manager) moveItem(moveID int64, moveTyp string, targetParentID *int64, targetIndex int) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Determine the old parent
	var oldParentID *int64
	if moveTyp == "folder" {
		err = tx.QueryRow("SELECT parent_id FROM folders WHERE id = ?", moveID).Scan(&oldParentID)
	} else {
		err = tx.QueryRow("SELECT folder_id FROM hosts WHERE id = ?", moveID).Scan(&oldParentID)
	}
	if err != nil {
		return err
	}

	// 2. Are we moving within the exact same parent?
	sameParent := false
	if oldParentID == nil && targetParentID == nil {
		sameParent = true
	} else if oldParentID != nil && targetParentID != nil && *oldParentID == *targetParentID {
		sameParent = true
	}

	itemToInsert := &siblingItem{id: moveID, typ: moveTyp}

	// 3. Reorder parents
	if sameParent {
		// Just rebuild the current parent
		err = m.reorderParent(tx, targetParentID, moveID, moveTyp, itemToInsert, targetIndex)
	} else {
		// Rebuild the old parent (exclude item, compact gaps)
		err = m.reorderParent(tx, oldParentID, moveID, moveTyp, nil, 0)
		if err == nil {
			// Rebuild the new parent (insert item, format ordering)
			err = m.reorderParent(tx, targetParentID, moveID, moveTyp, itemToInsert, targetIndex)
		}
	}

	if err != nil {
		return err
	}
	return tx.Commit()
}

// MoveFolder updates the parent and sort order of a folder, cleaning up old and new parent arrays.
func (m *Manager) MoveFolder(id int64, parentID *int64, sortOrder int) error {
	return m.moveItem(id, "folder", parentID, sortOrder)
}

// MoveHost updates the folder and sort order of a host, cleaning up old and new parent arrays.
func (m *Manager) MoveHost(id int64, folderID *int64, sortOrder int) error {
	return m.moveItem(id, "host", folderID, sortOrder)
}

// GetHostByAddress retrieves a host by its address (IP or FQDN).
func (m *Manager) GetHostByAddress(address string) (*Host, error) {
	var h Host
	var fid, cid *int64
	err := m.DB.QueryRow(`
		SELECT id, folder_id, credential_id, label, icon, address, type, port, sort_order, allow_deprecated 
		FROM hosts 
		WHERE LOWER(address) = LOWER(?) 
		LIMIT 1`, address).Scan(
		&h.ID, &fid, &cid, &h.Label, &h.Icon, &h.Address, &h.Type, &h.Port, &h.SortOrder, &h.AllowDeprecated)
	
	if err == sql.ErrNoRows {
		return nil, nil // Not found is not an error here
	}
	if err != nil {
		return nil, err
	}
	h.FolderID = fid
	h.CredentialID = cid
	return &h, nil
}
