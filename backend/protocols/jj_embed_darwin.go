//go:build darwin
// +build darwin

package protocols

import _ "embed"

//go:embed bin/darwin/jj
var jjBinary []byte

func getEmbeddedJJ() ([]byte, string) {
	return jjBinary, "jj"
}
