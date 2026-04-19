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
	// Pulizia URL: rimuove eventuali virgolette o spazi che il sistema operativo potrebbe passare
	cleanURL := strings.TrimSpace(rawURL)
	cleanURL = strings.Trim(cleanURL, "\"")
	cleanURL = strings.Trim(cleanURL, "'")

	u, err := url.Parse(cleanURL)
	if err != nil {
		return nil, fmt.Errorf("errore parsing URL '%s': %v", cleanURL, err)
	}

	parts := &URLParts{
		Protocol: strings.ToLower(u.Scheme),
	}

	if parts.Protocol != "ssh" && parts.Protocol != "telnet" {
		return nil, fmt.Errorf("schema non supportato: %s", parts.Protocol)
	}

	// Estrazione Host e User
	host := u.Hostname()
	user := ""
	if u.User != nil {
		user = u.User.Username()
		parts.Password, _ = u.User.Password()
	}

	// Se Host è vuoto, proviamo a estrarlo da Opaque o Path (capita se mancano le //)
	if host == "" {
		remainder := u.Opaque
		if remainder == "" {
			remainder = u.Path
		}
		remainder = strings.TrimPrefix(remainder, "//")
		remainder = strings.TrimSuffix(remainder, "/")

		// Gestione user@host
		if idx := strings.Index(remainder, "@"); idx != -1 {
			user = remainder[:idx]
			host = remainder[idx+1:]
		} else {
			host = remainder
		}

		// Rimuovi eventuale porta dall'host se presente (es. host:22)
		if idx := strings.LastIndex(host, ":"); idx != -1 {
			// Verifica che non sia un indirizzo IPv6 []
			if !strings.HasSuffix(host, "]") {
				portStr := host[idx+1:]
				fmt.Sscanf(portStr, "%d", &parts.Port)
				host = host[:idx]
			}
		}
	}

	parts.Host = host
	parts.User = user

	// Gestione porta se non ancora estratta
	if parts.Port == 0 {
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
	}

	// Pulizia finale host (rimozione slash se url.Parse lo ha considerato path)
	parts.Host = strings.TrimPrefix(parts.Host, "/")
	parts.Host = strings.TrimSuffix(parts.Host, "/")

	// Logging per debug
	fmt.Printf("[ProtocolHandler] URL originale: %s\n", rawURL)
	fmt.Printf("[ProtocolHandler] URL pulito: %s\n", cleanURL)
	fmt.Printf("[ProtocolHandler] Parsed: Host='%s', Port=%d, User='%s', Proto='%s'\n", 
		parts.Host, parts.Port, parts.User, parts.Protocol)

	return parts, nil
}
