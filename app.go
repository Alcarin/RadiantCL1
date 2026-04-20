package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"
	"path/filepath"

	"radiantcl1/backend/db"
	"radiantcl1/backend/osutils"
	"radiantcl1/backend/protocols"
	"radiantcl1/backend/vault"
	"radiantcl1/parser"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ASTNode struct {
	Type     string     `json:"type"`
	Value    string     `json:"value,omitempty"`
	Children []*ASTNode `json:"children,omitempty"`
}

type SessionLog struct {
	Filename  string    `json:"filename"`
	Timestamp time.Time `json:"timestamp"`
	Size      int64     `json:"size"`
}

type HostLogs struct {
	HostName string       `json:"hostName"`
	Sessions []SessionLog `json:"sessions"`
}


type App struct {
	ctx             context.Context
	dbManager       *db.Manager
	terminalService *protocols.TerminalService
	vaultService    *vault.VaultService
	jj              *protocols.JJService
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

	// Initialize JJ service
	a.jj = protocols.NewJJService()
	a.jj.SetContext(ctx)


	// Check if started with a URL
	if len(os.Args) > 1 {
		arg := strings.Trim(strings.TrimSpace(os.Args[1]), "\"")
		if strings.HasPrefix(arg, "ssh:") || strings.HasPrefix(arg, "telnet:") {
			go func() {
				// Attendi che il frontend sia pronto prima di gestire l'URL
				time.Sleep(2 * time.Second)
				a.HandleURL(arg)
			}()
		}
	}
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

// GetHostByAddress restituisce un host dato l'indirizzo IP o FQDN
func (a *App) GetHostByAddress(address string) (*db.Host, error) {
	if a.dbManager == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.dbManager.GetHostByAddress(address)
}

type HostWithCredentials struct {
	Host     *db.Host `json:"host"`
	Username string   `json:"username"`
}

// GetHostWithCredentials recupera host e username associato (se presente)
func (a *App) GetHostWithCredentials(address string) (*HostWithCredentials, error) {
	h, err := a.GetHostByAddress(address)
	if err != nil || h == nil {
		return nil, err
	}

	username := ""
	if h.CredentialID != nil {
		user, _, err := a.vaultService.GetPassword(*h.CredentialID)
		if err == nil {
			username = user
		}
	}

	return &HostWithCredentials{
		Host:     h,
		Username: username,
	}, nil
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
// Se hostID > 0, recupera i dettagli dal database. Altrimenti usa i parametri passati (connessione ad-hoc).
func (a *App) ConnectTerminal(sessionID string, hostID int64, address string, port int, protocolType string, username string, password string, allowDeprecated bool) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}

	var h db.Host
	if hostID > 0 {
		// Recupera dati host persistito
		err := a.dbManager.DB.QueryRow("SELECT id, label, icon, address, type, port, credential_id, allow_deprecated FROM hosts WHERE id = ?", hostID).Scan(
			&h.ID, &h.Label, &h.Icon, &h.Address, &h.Type, &h.Port, &h.CredentialID, &h.AllowDeprecated)
		if err != nil {
			return fmt.Errorf("failed to fetch host: %w", err)
		}
	} else {
		// Connessione temporanea (o hostID non valido)
		h = db.Host{
			ID:              0,
			Label:           address,
			Icon:            "terminal",
			Address:         address,
			Type:            protocolType,
			Port:            port,
			AllowDeprecated: allowDeprecated,
		}
		if h.Type == "" {
			h.Type = "ssh" // Default
		}
		if h.Port == 0 {
			if h.Type == "ssh" {
				h.Port = 22
			} else {
				h.Port = 23
			}
		}
	}
	if h.Label == "" {
		h.Label = h.Address
	}

	// Usa il flag passato esplicitamente (per il retry) o quello salvato nel database
	finalAllowDeprecated := h.AllowDeprecated || allowDeprecated

	finalUser := username
	finalPass := password

	if finalUser == "" && h.CredentialID != nil {
		savedUser, savedPass, err := a.vaultService.GetPassword(*h.CredentialID)
		if err == nil {
			finalUser = savedUser
			finalPass = savedPass
		}
	}

	if h.Type == "ssh" {
		a.terminalService.ConnectSSH(sessionID, h.ID, h.Label, h.Icon, h.Address, h.Port, finalUser, finalPass, finalAllowDeprecated)
	} else {
		a.terminalService.ConnectTelnet(sessionID, h.ID, h.Label, h.Icon, h.Address, h.Port)
	}

	return nil
}

// UpdateHostAllowDeprecated aggiorna la preferenza per i protocolli deprecati
func (a *App) UpdateHostAllowDeprecated(hostID int64, allow bool) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.SetHostAllowDeprecated(hostID, allow)
}

// AbortConnection interrompe una connessione in corso o una sessione attiva
func (a *App) AbortConnection(sessionID string) {
	a.terminalService.RemoveSession(sessionID)
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

// GetSetting recupera una preferenza dell'utente
func (a *App) GetSetting(key string) (string, error) {
	if a.dbManager == nil {
		return "", fmt.Errorf("database not initialized")
	}
	return a.dbManager.GetSetting(key)
}

// SaveSetting salva una preferenza dell'utente
func (a *App) SaveSetting(key string, value string) error {
	if a.dbManager == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.dbManager.SaveSetting(key, value)
}

// OS INTEGRATION - PROTOCOL HANDLERS

// GetProtocolStatus restituisce lo stato dei protocolli nel sistema
func (a *App) GetProtocolStatus() (osutils.ProtocolStatus, error) {
	return osutils.GetStatus()
}

// RegisterProtocolHandlers registra l'app per gestire ssh:// e telnet://
func (a *App) RegisterProtocolHandlers() error {
	return osutils.Register()
}

// UnregisterProtocolHandlers rimuove la registrazione
func (a *App) UnregisterProtocolHandlers() error {
	return osutils.Unregister()
}

// HandleSecondInstance gestisce l'apertura di una seconda istanza tramite URL
func (a *App) HandleSecondInstance(data options.SecondInstanceData) {
	if len(data.Args) > 0 {
		for _, arg := range data.Args {
			// Pulizia preventiva: rimuove spazi e virgolette
			cleanArg := strings.TrimSpace(arg)
			cleanArg = strings.Trim(cleanArg, "\"")
			cleanArg = strings.Trim(cleanArg, "'")

			if strings.HasPrefix(cleanArg, "ssh:") || strings.HasPrefix(cleanArg, "telnet:") {
				runtime.WindowUnminimise(a.ctx)
				runtime.WindowShow(a.ctx)
				a.HandleURL(cleanArg)
				break
			}
		}
	}
}

// HandleURL analizza un URL ed emette un evento per il frontend
func (a *App) HandleURL(rawURL string) error {
	parts, err := osutils.ParseURL(rawURL)
	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to parse URL %s: %v", rawURL, err)
		return err
	}

	// Emette l'evento come mappa esplicita per evitare problemi di Case-Sensitivity in JS
	runtime.EventsEmit(a.ctx, "app:protocol-request", map[string]interface{}{
		"protocol": parts.Protocol,
		"host":     parts.Host,
		"port":     parts.Port,
		"user":     parts.User,
		"password": parts.Password,
	})
	return nil
}

// GetSessionLogs recupera l'elenco di tutti i log raggruppati per host
func (a *App) GetSessionLogs() ([]HostLogs, error) {
	configDir, err := db.GetConfigDir()
	if err != nil {
		return nil, err
	}

	hostsDir := filepath.Join(configDir, "hosts")
	if _, err := os.Stat(hostsDir); os.IsNotExist(err) {
		return []HostLogs{}, nil
	}

	entries, err := os.ReadDir(hostsDir)
	if err != nil {
		return nil, err
	}

	var result []HostLogs
	for _, entry := range entries {
		// Ignoriamo la cartella .jj e la cartella bin
		if !entry.IsDir() || entry.Name() == "bin" || entry.Name() == ".jj" {
			continue
		}

		hostName := entry.Name()
		logDir := filepath.Join(hostsDir, hostName, "log")
		
		if _, err := os.Stat(logDir); os.IsNotExist(err) {
			continue
		}

		logEntries, err := os.ReadDir(logDir)
		if err != nil {
			continue
		}

		var sessions []SessionLog
		for _, logEntry := range logEntries {
			if logEntry.IsDir() || !strings.HasSuffix(logEntry.Name(), ".log") {
				continue
			}

			info, err := logEntry.Info()
			if err != nil {
				continue
			}

			// Il formato è session_20060102_150405.log
			name := logEntry.Name()
			ts := info.ModTime() // Default to file mod time
			
			// Prova a parsare il timestamp dal nome del file per maggiore precisione
			if strings.HasPrefix(name, "session_") {
				parts := strings.Split(strings.TrimSuffix(name, ".log"), "_")
				if len(parts) >= 3 {
					// parts[1] = 20060102, parts[2] = 150405
					// ParseInLocation usa la timezone locale della macchina (non UTC)
					parsedTs, err := time.ParseInLocation("20060102_150405", parts[1]+"_"+parts[2], time.Local)
					if err == nil {
						ts = parsedTs
					}
				}
			}

			sessions = append(sessions, SessionLog{
				Filename:  name,
				Timestamp: ts,
				Size:      info.Size(),
			})
		}

		if len(sessions) > 0 {
			result = append(result, HostLogs{
				HostName: hostName,
				Sessions: sessions,
			})
		}
	}

	return result, nil
}

// GetLogContent restituisce il contenuto di un file di log specifico
func (a *App) GetLogContent(hostName, filename string) (string, error) {
	configDir, err := db.GetConfigDir()
	if err != nil {
		return "", err
	}

	// Validazione minima per sicurezza
	if strings.Contains(hostName, "..") || strings.Contains(filename, "..") {
		return "", fmt.Errorf("invalid path")
	}

	logPath := filepath.Join(configDir, "hosts", hostName, "log", filename)
	content, err := os.ReadFile(logPath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

// GetLogRevisions recupera l'elenco dei commit che hanno modificato un file di log
func (a *App) GetLogRevisions(hostName, filename string) ([]protocols.LogRevision, error) {
	return a.jj.ListRevisions(hostName, filename)
}

// GetLogContentAtRevision recupera il contenuto del log a una specifica revisione
func (a *App) GetLogContentAtRevision(revision, hostName, filename string) (string, error) {
	return a.jj.GetRevisionContent(revision, hostName, filename)
}

// PreloadLogFrames scarica il file e lo divide in delta cronologici
func (a *App) PreloadLogFrames(hostName, filename string) ([]protocols.LogFrame, error) {
	return a.jj.PreloadLogFrames(hostName, filename)
}
