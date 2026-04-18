//go:build windows
// +build windows

package protocols

import _ "embed"

//go:embed bin/windows/jj.exe
var jjBinary []byte

func getEmbeddedJJ() ([]byte, string) {
	return jjBinary, "jj.exe"
}
