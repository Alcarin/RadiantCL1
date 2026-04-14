package parser

//#cgo CFLAGS: -I${SRCDIR}/Tree-Sitter-Cisco/src
//#include "Tree-Sitter-Cisco/src/parser.c"
//#include "Tree-Sitter-Cisco/src/scanner.c"
import "C"

import (
	tree_sitter_cisco "github.com/Alcarin/tree-sitter-cisco/bindings/go"
	tree_sitter "github.com/tree-sitter/go-tree-sitter"
)

// Language returns the tree-sitter language for Cisco IOS/NX-OS
func Language() *tree_sitter.Language {
	return tree_sitter_cisco.Language()
}
