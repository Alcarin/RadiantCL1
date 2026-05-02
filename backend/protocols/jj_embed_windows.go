//go:build windows
// +build windows

package protocols

import (
	_ "embed"
	"os/exec"
	"syscall"
)

//go:embed bin/windows/jj.exe
var jjBinary []byte

func getEmbeddedJJ() ([]byte, string) {
	return jjBinary, "jj.exe"
}

func prepareCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
