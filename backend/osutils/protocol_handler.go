package osutils

import (
	"fmt"
	"net/url"
	"strings"
)

// ProtocolStatus rappresenta lo stato della registrazione dei protocolli nel sistema
type ProtocolStatus struct {
	Registered  bool   `json:"registered"`
	PathMatch   bool   `json:"pathMatch"`
	CurrentPath string `json:"currentPath"`
	Details     string `json:"details"`
}

// URLParts contiene i componenti estratti da un URL ssh:// o telnet://
type URLParts struct {
	Protocol string
	User     string
	Password string
	Host     string
	Port     int
}

// GetStatus verifica se i protocolli ssh:// e telnet:// sono registrati per l'eseguibile corrente
func GetStatus() (ProtocolStatus, error) {
	return getPlatformStatus()
}

// Register registra l'eseguibile corrente come gestore per ssh:// e telnet://
func Register() error {
	return registerPlatform()
}

// Unregister rimuove le associazioni dei protocolli
func Unregister() error {
	return unregisterPlatform()
}

// ParseURL analizza un URL ssh:// o telnet://
func ParseURL(rawURL string) (*URLParts, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}

	parts := &URLParts{
		Protocol: strings.ToLower(u.Scheme),
		Host:     u.Hostname(),
	}

	if parts.Protocol != "ssh" && parts.Protocol != "telnet" {
		return nil, fmt.Errorf("schema non supportato: %s", parts.Protocol)
	}

	if u.User != nil {
		parts.User = u.User.Username()
		parts.Password, _ = u.User.Password()
	}

	portStr := u.Port()
	if portStr != "" {
		fmt.Sscanf(portStr, "%d", &parts.Port)
	} else {
		if parts.Protocol == "ssh" {
			parts.Port = 22
		} else {
			parts.Port = 23
		}
	}

	// Se l'host è vuoto, potrebbe essere un formato tipo ssh://1.2.3.4 (senza path)
	// url.Parse a volte mette tutto nel Path se non c'è // o se è malformato
	if parts.Host == "" && u.Path != "" {
		parts.Host = strings.TrimPrefix(u.Path, "/")
	}

	return parts, nil
}
