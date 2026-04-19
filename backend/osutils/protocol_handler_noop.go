//go:build !windows && !linux && !darwin

package osutils

import "fmt"

func getPlatformStatus() (ProtocolStatus, error) {
	return ProtocolStatus{}, fmt.Errorf("piattaforma non supportata")
}

func registerPlatform() error {
	return fmt.Errorf("piattaforma non supportata")
}

func unregisterPlatform() error {
	return fmt.Errorf("piattaforma non supportata")
}
