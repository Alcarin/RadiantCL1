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

type LogRevision struct {
	ID        string    `json:"id"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

type LogFrame struct {
	ID        string    `json:"id"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Delta     string    `json:"delta"`
}


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
		prepareCommand(cmd)
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
	prepareCommand(cmd)
	cmd.Dir = hostsDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("jj commit failed: %v, output: %s", err, string(output))
	}

	return nil
}

// ListRevisions restituisce l'elenco dei commit che hanno modificato un file specifico
func (s *JJService) ListRevisions(hostName, filename string) ([]LogRevision, error) {
	// Rimuoviamo il Lock sull'intero metodo per evitare Deadlock rientranti con InitRepo()
	err := s.InitRepo()
	if err != nil {
		return nil, err
	}

	configDir, err := db.GetConfigDir()
	if err != nil {
		return nil, err
	}
	hostsDir := filepath.Join(configDir, "hosts")
	
	relPath := filepath.Join(hostName, "log", filename)

	// Usiamo un template per ottenere ID, messaggio e timestamp
	// Utilizziamo un separatore forte "|||" per evitare conflitti coi messaggi scritti su terminale.
	template := `commit_id.short() ++ "|||" ++ description.first_line() ++ "|||" ++ committer.timestamp().format("%Y-%m-%dT%H:%M:%S%z") ++ "\n"`
	
	// Utilizziamo il percorso col formato UNIX per jj passandolo in fondo
	normalizedPath := filepath.ToSlash(relPath)
	cmd := exec.Command(s.binaryPath, "log", "--no-graph", "-r", "::", "--template", template, normalizedPath)
	prepareCommand(cmd)
	cmd.Dir = hostsDir

	fmt.Printf("[DEBUG-JJ] Esecuzione: %s\n", cmd.String())
	fmt.Printf("[DEBUG-JJ] Cwd: %s\n", cmd.Dir)

	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Printf("[DEBUG-JJ] ERRORE: %v | Output: %s\n", err, string(output))
		return nil, fmt.Errorf("jj log failed: %v, output: %s", err, string(output))
	}
	
	fmt.Printf("[DEBUG-JJ] SUCCESS, Output Length: %d, Data: %s\n", len(string(output)), string(output))

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var revisions []LogRevision
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "|||")
		if len(parts) < 3 {
			continue
		}

		ts, _ := time.Parse("2006-01-02T15:04:05-0700", parts[2])
		// Se il parsing fallisce, proviamo con altri formati o lasciamo zero time
		if ts.IsZero() {
			ts, _ = time.Parse(time.RFC3339, parts[2])
		}

		revisions = append(revisions, LogRevision{
			ID:        parts[0],
			Message:   parts[1],
			Timestamp: ts,
		})
	}

	// Invertiamo l'ordine per avere dal più vecchio al più recente (cronologico per playback)
	for i, j := 0, len(revisions)-1; i < j; i, j = i+1, j-1 {
		revisions[i], revisions[j] = revisions[j], revisions[i]
	}

	return revisions, nil
}

// GetRevisionContent recupera il contenuto di un file a una specifica revisione
func (s *JJService) GetRevisionContent(revision, hostName, filename string) (string, error) {
	err := s.InitRepo()
	if err != nil {
		return "", err
	}

	configDir, err := db.GetConfigDir()
	if err != nil {
		return "", err
	}
	hostsDir := filepath.Join(configDir, "hosts")

	relPath := filepath.Join(hostName, "log", filename)
	normalizedPath := filepath.ToSlash(relPath)

	cmd := exec.Command(s.binaryPath, "file", "show", "-r", revision, normalizedPath)
	prepareCommand(cmd)
	cmd.Dir = hostsDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("jj file show failed: %v, output: %s", err, string(output))
	}

	return string(output), nil
}

// PreloadLogFrames espande ListRevisions scaricando interamente lo storico testuale del file,
// ma ottimizzando il payload ritornando solo il "Delta" (il nuovo testo inserito ad ogni log)
func (s *JJService) PreloadLogFrames(hostName, filename string) ([]LogFrame, error) {
	revisions, err := s.ListRevisions(hostName, filename)
	if err != nil {
		return nil, err
	}

	var frames []LogFrame
	var previousText string

	for _, rev := range revisions {
		content, err := s.GetRevisionContent(rev.ID, hostName, filename)
		if err != nil {
			// Se fallisce l'estrazione singola procediamo col prossimo o vuoto
			content = ""
		}

		delta := content
		if len(content) >= len(previousText) && strings.HasPrefix(content, previousText) {
			delta = content[len(previousText):]
		}
		
		frames = append(frames, LogFrame{
			ID:        rev.ID,
			Message:   rev.Message,
			Timestamp: rev.Timestamp,
			Delta:     delta,
		})

		previousText = content
	}

	return frames, nil
}

