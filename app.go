package main

import (
	"context"
	"os"
	"path/filepath"

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
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
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

