//go:build windows

package osutils

import (
	"fmt"
	"os"
	"strings"

	"golang.org/x/sys/windows/registry"
)

func getPlatformStatus() (ProtocolStatus, error) {
	exePath, err := os.Executable()
	if err != nil {
		return ProtocolStatus{}, err
	}

	status := ProtocolStatus{Registered: false, CurrentPath: exePath}
	
	// Controlliamo il protocollo ssh
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Classes\ssh\shell\open\command`, registry.QUERY_VALUE)
	if err != nil {
		return status, nil // Non registrato
	}
	defer k.Close()

	val, _, err := k.GetStringValue("")
	if err != nil {
		return status, nil
	}

	status.Registered = true
	// Il valore è tipicamente "C:\path\to\app.exe" "%1"
	// Rimuoviamo virgolette e argomenti per confrontare il path
	registeredPath := strings.Trim(strings.Split(val, " \"%1\"")[0], "\"")
	
	if strings.EqualFold(registeredPath, exePath) {
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

	protocols := []string{"ssh", "telnet"}
	
	for _, proto := range protocols {
		keyPath := fmt.Sprintf(`Software\Classes\%s`, proto)
		
		// 1. Crea/Apri la chiave del protocollo
		k, _, err := registry.CreateKey(registry.CURRENT_USER, keyPath, registry.ALL_ACCESS)
		if err != nil {
			return err
		}
		
		k.SetStringValue("", fmt.Sprintf("URL:%s Protocol", strings.ToUpper(proto)))
		k.SetStringValue("URL Protocol", "")
		k.Close()

		// 2. DefaultIcon
		kIcon, _, err := registry.CreateKey(registry.CURRENT_USER, keyPath+`\DefaultIcon`, registry.ALL_ACCESS)
		if err == nil {
			kIcon.SetStringValue("", fmt.Sprintf("\"%s\",0", exePath))
			kIcon.Close()
		}

		// 3. Command
		cmdPath := keyPath + `\shell\open\command`
		kCmd, _, err := registry.CreateKey(registry.CURRENT_USER, cmdPath, registry.ALL_ACCESS)
		if err != nil {
			return err
		}
		kCmd.SetStringValue("", fmt.Sprintf("\"%s\" \"%%1\"", exePath))
		kCmd.Close()
	}
	
	return nil
}

func unregisterPlatform() error {
	protocols := []string{"ssh", "telnet"}
	for _, proto := range protocols {
		registry.DeleteKey(registry.CURRENT_USER, fmt.Sprintf(`Software\Classes\%s\shell\open\command`, proto))
		registry.DeleteKey(registry.CURRENT_USER, fmt.Sprintf(`Software\Classes\%s\shell\open`, proto))
		registry.DeleteKey(registry.CURRENT_USER, fmt.Sprintf(`Software\Classes\%s\shell`, proto))
		registry.DeleteKey(registry.CURRENT_USER, fmt.Sprintf(`Software\Classes\%s\DefaultIcon`, proto))
		registry.DeleteKey(registry.CURRENT_USER, fmt.Sprintf(`Software\Classes\%s`, proto))
	}
	return nil
}
