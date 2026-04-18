//go:build linux
// +build linux

package protocols

import _ "embed"

//go:embed bin/linux/jj
var jjBinary []byte

func getEmbeddedJJ() ([]byte, string) {
	return jjBinary, "jj"
}
