package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"radiantcl1/backend/db"
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
	ctx       context.Context
	dbManager *db.Manager
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
	return a.dbManager.UpdateHost(h)
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

