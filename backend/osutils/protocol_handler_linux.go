//go:build linux

package osutils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func getPlatformStatus() (ProtocolStatus, error) {
	exePath, err := os.Executable()
	if err != nil {
		return ProtocolStatus{}, err
	}

	status := ProtocolStatus{Registered: false, CurrentPath: exePath}
	
	home, err := os.UserHomeDir()
	if err != nil {
		return status, err
	}

	desktopFilePath := filepath.Join(home, ".local/share/applications/radiantcl1.desktop")
	content, err := os.ReadFile(desktopFilePath)
	if err != nil {
		return status, nil // Non registrato
	}

	status.Registered = true
	// Cerchiamo la riga Exec=
	lines := strings.Split(string(content), "\n")
	var registeredPath string
	for _, line := range lines {
		if strings.HasPrefix(line, "Exec=") {
			registeredPath = strings.TrimPrefix(line, "Exec=")
			registeredPath = strings.Split(registeredPath, " %u")[0] // Rimuoviamo l'argomento %u
			break
		}
	}

	if registeredPath == exePath {
		status.PathMatch = true
		status.Details = "Registrato correttamente"
	} else {
		status.PathMatch = false
		status.Details = fmt.Sprintf("Registrato a un altro percorso: %s", registeredPath)
	}

	return status, nil
}

func registerPlatform() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	appsDir := filepath.Join(home, ".local/share/applications")
	os.MkdirAll(appsDir, 0755)

	desktopFile := fmt.Sprintf(`[Desktop Entry]
Name=RadiantCL1
Exec=%s %%u
Type=Application
Terminal=false
MimeType=x-scheme-handler/ssh;x-scheme-handler/telnet;
`, exePath)

	desktopPath := filepath.Join(appsDir, "radiantcl1.desktop")
	err = os.WriteFile(desktopPath, []byte(desktopFile), 0644)
	if err != nil {
		return err
	}

	// Aggiorniamo il database dei handler
	exec.Command("update-desktop-database", appsDir).Run()
	
	// Impostiamo come default per entrambi i protocolli
	exec.Command("xdg-mime", "default", "radiantcl1.desktop", "x-scheme-handler/ssh").Run()
	exec.Command("xdg-mime", "default", "radiantcl1.desktop", "x-scheme-handler/telnet").Run()

	return nil
}

func unregisterPlatform() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	desktopPath := filepath.Join(home, ".local/share/applications/radiantcl1.desktop")
	return os.Remove(desktopPath)
}
