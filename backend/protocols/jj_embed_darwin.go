//go:build darwin
// +build darwin

package protocols

import (
	_ "embed"
	"os/exec"
)

//go:embed bin/darwin/jj
var jjBinary []byte

func getEmbeddedJJ() ([]byte, string) {
	return jjBinary, "jj"
}

func prepareCommand(cmd *exec.Cmd) {}
