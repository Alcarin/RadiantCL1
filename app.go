package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"radiantcl1/backend/db"
	"radiantcl1/backend/protocols"
	"radiantcl1/backend/vault"
	"radiantcl1/parser"
	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ASTNode struct {
	Type     string     `json:"type"`
	Value    string     `json:"value,omitempty"`
	Children []*ASTNode `json:"children,omitempty"`
}

type App struct {
	ctx             context.Context
	dbManager       *db.Manager
	terminalService *protocols.TerminalService
	vaultService    *vault.VaultService
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Initialize database
	manager, err := db.NewManager()
	if err != nil {
		runtime.LogErrorf(ctx, "Failed to initialize database: %v", err)
	} else {
		a.dbManager = manager
	}

	// Initialize terminal service
	a.terminalService = protocols.NewTerminalService()
	a.terminalService.SetContext(ctx)

	// Initialize vault service
	a.vaultService = vault.NewVaultService()
}

// shutdown is called when the application is terminating
func (a *App) shutdown(ctx context.Context) {
	if a.dbManager != nil {
		a.dbManager.Close()
	}
}

type FileResponse struct {
	Name    string   `json:"name"`
	Path    string   `json:"path"`
	Content string   `json:"content"`
	AST     *ASTNode `json:"ast"`
	Error   string   `json:"error,omitempty"`
}

// OpenConfig opens a file dialog, reads the file, parses it with Tree-sitter and returns the content and AST
func (a *App) OpenConfig() *FileResponse {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Seleziona file di configurazione Cisco",
	})
	
	if err != nil {
		return &FileResponse{Error: err.Error()}
	}
	if path == "" {
		return nil // Canceled
	}

	content, err := os.ReadFile(path)
	if err != nil {
		return &FileResponse{Error: err.Error()}
	}

	tsParser := tree_sitter.NewParser()
	tsParser.SetLanguage(parser.Language())

	tree := tsParser.Parse(content, nil)
	if tree == nil {
		return &FileResponse{Error: "Errore parsing: albero nullo"}
	}

	ast := nodeToAST(tree.RootNode(), content)

	return &FileResponse{
		Name:    filepath.Base(path),
		Path:    path,
		Content: string(content),
		AST:     ast,
	}
}

func nodeToAST(node *tree_sitter.Node, content []byte) *ASTNode {
	ast := &ASTNode{
		Type: node.Kind(),
	}
	
	count := node.ChildCount()
	if count == 0 {
		ast.Value = node.Utf8Text(content)
	} else {
		for i := uint(0); i < count; i++ {
			child := node.Child(i)
			if child != nil {
				ast.Children = append(ast.Children, nodeToAST(child, content))
			}
		}
	}
	return ast
}

// GetTreeData returns all folders and hosts from the database
func (a *App) GetTreeData() (db.TreeData, error) {
	if a.dbManager == nil {
		return db.TreeData{}, fmt.Errorf("database not initialized")
	}
	return a.dbManager.GetTreeData()
}

// AddFolder adds a new folder to the database
func (a *App) AddFolder(f db.Folder) (int64, error) {
	if a.dbManager == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	return a.dbManager.AddFolder(f)
}

// AddHost adds a new host to the database
func (a *App) AddHost(h db.Host) (int64, error) {
	if a.dbManager == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	return a.dbManager.AddHost(h)
}

// ToggleFolderExpanded updates the expanded state of a folder
func (a *App) ToggleFolderExpanded(id int64, expanded bool) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.SetFolderExpanded(id, expanded)
}

// UpdateFolder updates an existing folder in the database
func (a *App) UpdateFolder(f db.Folder) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.UpdateFolder(f)
}

// DeleteFolder deletes a folder and its contents
func (a *App) DeleteFolder(id int64) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.DeleteFolder(id)
}

// UpdateHost updates an existing host in the database
func (a *App) UpdateHost(h db.Host) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	err := a.dbManager.UpdateHost(h)
	if err == nil {
		if a.terminalService != nil {
			a.terminalService.UpdateHostMetadata(h.ID, h.Label, h.Icon)
		}
		runtime.EventsEmit(a.ctx, "app:host-updated", h)
	}
	return err
}

// DeleteHost deletes a host from the database
func (a *App) DeleteHost(id int64) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.DeleteHost(id)
}

// MoveItem moves a folder or a host to a new parent/folder and updates its sort order
func (a *App) MoveItem(itemType string, id int64, targetFolderID int64, sortOrder int) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}

	var targetID *int64
	if targetFolderID > 0 {
		val := targetFolderID
		targetID = &val
	}

	if itemType == "folder" {
		return a.dbManager.MoveFolder(id, targetID, sortOrder)
	} else if itemType == "host" {
		return a.dbManager.MoveHost(id, targetID, sortOrder)
	}
	return fmt.Errorf("invalid item type: %s", itemType)
}

// ConnectTerminal avvia una connessione terminale per un host.
// Se l'host ha un profilo di credenziali associato, lo usa automaticamente.
// Altrimenti usa username/password passati dal frontend (se presenti).
func (a *App) ConnectTerminal(hostID int64, username string, password string) (string, error) {
	if a.dbManager == nil {
		return "", fmt.Errorf("database not initialized")
	}

	// 1. Recupera dati host
	var h db.Host
	err := a.dbManager.DB.QueryRow("SELECT id, label, icon, address, type, port, credential_id FROM hosts WHERE id = ?", hostID).Scan(
		&h.ID, &h.Label, &h.Icon, &h.Address, &h.Type, &h.Port, &h.CredentialID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch host: %w", err)
	}

	finalUser := username
	finalPass := password

	// 2. Se l'host ha un profilo associato, usalo
	if h.CredentialID != nil {
		savedUser, savedPass, err := a.vaultService.GetPassword(*h.CredentialID)
		if err == nil {
			finalUser = savedUser
			finalPass = savedPass
		}
	}

	sessionID := fmt.Sprintf("term-%d-%d", hostID, os.Getpid())
	
	if h.Type == "ssh" {
		err = a.terminalService.ConnectSSH(sessionID, h.ID, h.Label, h.Icon, h.Address, h.Port, finalUser, finalPass)
	} else {
		// Telnet ignora user/pass passati dalla modale poiché è interattivo nel terminale
		err = a.terminalService.ConnectTelnet(sessionID, h.ID, h.Label, h.Icon, h.Address, h.Port)
	}

	if err != nil {
		return "", err
	}

	return sessionID, nil
}

// GetCredentials restituisce l'elenco dei profili di credenziali
func (a *App) GetCredentials() ([]db.Credential, error) {
	if a.dbManager == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.dbManager.GetCredentials()
}

// AddCredential crea un nuovo profilo e salva la password nel vault
func (a *App) AddCredential(c db.Credential) (int64, error) {
	if a.dbManager == nil || a.vaultService == nil {
		return 0, fmt.Errorf("services not initialized")
	}
	
	id, err := a.dbManager.AddCredential(c)
	if err != nil {
		return 0, err
	}
	
	if c.Password != "" {
		_ = a.vaultService.StorePassword(id, c.Username, c.Password)
	}
	
	return id, nil
}

// UpdateCredential aggiorna un profilo e opzionalmente la password nel vault
func (a *App) UpdateCredential(c db.Credential) error {
	if a.dbManager == nil || a.vaultService == nil {
		return fmt.Errorf("services not initialized")
	}
	
	err := a.dbManager.UpdateCredential(c)
	if err != nil {
		return err
	}
	
	if c.Password != "" {
		_ = a.vaultService.StorePassword(c.ID, c.Username, c.Password)
	}
	
	return nil
}

// DeleteCredential rimuove un profilo e le credenziali dal vault
func (a *App) DeleteCredential(id int64) error {
	if a.dbManager == nil || a.vaultService == nil {
		return fmt.Errorf("services not initialized")
	}
	
	_ = a.vaultService.DeletePassword(id)
	return a.dbManager.DeleteCredential(id)
}

// GetCredentialPassword recupera la password per visualizzarla nel manager (sicuro)
func (a *App) GetCredentialPassword(id int64) (string, error) {
	if a.vaultService == nil {
		return "", fmt.Errorf("vault not initialized")
	}
	_, pass, err := a.vaultService.GetPassword(id)
	return pass, err
}

// GetActiveConnections restituisce l'elenco delle connessioni attive
func (a *App) GetActiveConnections() []protocols.SessionInfo {
	if a.terminalService == nil {
		return []protocols.SessionInfo{}
	}
	return a.terminalService.GetSessions()
}

// SendTerminalData invia dati a una sessione terminale attiva
func (a *App) SendTerminalData(sessionID string, data string) error {
	return a.terminalService.SendData(sessionID, data)
}

// ResizeTerminal ridimensiona la finestra del terminale remoto
func (a *App) ResizeTerminal(sessionID string, cols, rows int) error {
	return a.terminalService.ResizeTerminal(sessionID, cols, rows)
}

// CloseTerminal chiude una sessione terminale
func (a *App) CloseTerminal(sessionID string) {
	a.terminalService.RemoveSession(sessionID)
}

// MarkTerminalReady segnala che il frontend è pronto a ricevere dati per la sessione
func (a *App) MarkTerminalReady(sessionID string) {
	a.terminalService.MarkReady(sessionID)
}

