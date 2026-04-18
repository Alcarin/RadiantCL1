package protocols

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"radiantcl1/backend/db"
	"strings"
	"sync"
	"time"
)

type JJService struct {
	ctx             context.Context
	binaryPath      string
	repoInitialized bool
	mu              sync.Mutex
}

func NewJJService() *JJService {
	return &JJService{}
}

func (s *JJService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// EnsureBinary si assicura che il binario corretto sia estratto e pronto all'uso
func (s *JJService) EnsureBinary() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.binaryPath != "" {
		return nil
	}

	binDir, err := db.GetBinDir()
	if err != nil {
		return err
	}

	// Ottiene il binario embedded specifico per la piattaforma corrente
	data, binaryName := getEmbeddedJJ()

	targetPath := filepath.Join(binDir, binaryName)

	// Scrivi su disco solo se necessario (se il file non esiste o ha dimensione diversa)
	if info, err := os.Stat(targetPath); err == nil && info.Size() == int64(len(data)) {
		s.binaryPath = targetPath
		return nil
	}

	// Scrivi su disco
	err = os.WriteFile(targetPath, data, 0755)
	if err != nil {
		return fmt.Errorf("failed to write binary to %s: %w", targetPath, err)
	}

	s.binaryPath = targetPath
	return nil
}

// InitRepo inizializza il repository jj nella cartella hosts
func (s *JJService) InitRepo() error {
	if s.repoInitialized {
		return nil
	}

	err := s.EnsureBinary()
	if err != nil {
		return err
	}

	configDir, err := db.GetConfigDir()
	if err != nil {
		return err
	}
	hostsDir := filepath.Join(configDir, "hosts")
	
	// Crea la cartella hosts se non esiste
	if _, err := os.Stat(hostsDir); os.IsNotExist(err) {
		err = os.MkdirAll(hostsDir, 0755)
		if err != nil {
			return err
		}
	}

	// Verifica se c'è già un repo jj (controlla la cartella .jj)
	if _, err := os.Stat(filepath.Join(hostsDir, ".jj")); os.IsNotExist(err) {
		cmd := exec.Command(s.binaryPath, "git", "init") // Inizializza con backend git per massima interoperabilità
		cmd.Dir = hostsDir
		if output, err := cmd.CombinedOutput(); err != nil {
			outStr := string(output)
			// Se il repo esiste già, consideriamo l'operazione riuscita
			if strings.Contains(outStr, "already exists") || strings.Contains(outStr, "already initialized") {
				s.repoInitialized = true
				return nil
			}
			return fmt.Errorf("jj git init failed: %v, output: %s", err, outStr)
		}
	}

	s.repoInitialized = true
	return nil
}

// Commit esegue un commit con un messaggio specifico
func (s *JJService) Commit(sessionId, hostname, direction string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.InitRepo()
	if err != nil {
		return err
	}

	configDir, err := db.GetConfigDir()
	if err != nil {
		return err
	}
	hostsDir := filepath.Join(configDir, "hosts")

	// Messaggio: [SessionID] | [Timestamp] | [Direction]
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	message := fmt.Sprintf("%s | %s | %s", sessionId, timestamp, direction)

	// In JJ, per creare una nuova revisione atomica dei cambiamenti correnti:
	// Usiamo 'jj commit -m message' per chiudere la revisione corrente e iniziarne una nuova.
	cmd := exec.Command(s.binaryPath, "commit", "-m", message)
	cmd.Dir = hostsDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("jj commit failed: %v, output: %s", err, string(output))
	}

	return nil
}
