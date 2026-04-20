package protocols

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestJJListRevisionsWithSpace(t *testing.T) {
	hostName := "Server Debian"
	filename := "session_20260418_183002.log"
	
	hostsDir := `C:\Users\franc\.RadiantCL1\hosts`
	binaryPath := `C:\Users\franc\.RadiantCL1\bin\jj.exe`

	relPath := filepath.Join(hostName, "log", filename)
	normalizedPath := filepath.ToSlash(relPath)
	
	template := `commit_id.short() ++ "|" ++ description.first_line() ++ "|" ++ committer.timestamp().format("%Y-%m-%dT%H:%M:%S%z") ++ "\n"`

	cmd := exec.Command(binaryPath, "log", "--no-graph", "-r", "::", "--template", template, normalizedPath)
	cmd.Dir = hostsDir

	fmt.Printf("Eseguo comando: %s\n", cmd.String())
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Errore jj log: %v | Output: %s", err, string(output))
	}
	
	strOut := string(output)
	fmt.Printf("Risultato grezzo (length: %d):\n%s\n", len(strOut), strOut)

	lines := strings.Split(strings.TrimSpace(strOut), "\n")
	var revisions []LogRevision
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "|")
		if len(parts) < 3 {
			t.Logf("Riga non valida (meno di 3 parts): %s", line)
			continue
		}

		ts, _ := time.Parse("2006-01-02T15:04:05-0700", parts[2])
		if ts.IsZero() {
			ts, _ = time.Parse(time.RFC3339, parts[2])
		}

		revisions = append(revisions, LogRevision{
			ID:        parts[0],
			Message:   parts[1],
			Timestamp: ts,
		})
	}
	
	fmt.Printf("Revisioni parsate: %d\n", len(revisions))
	if len(revisions) == 0 {
		t.Errorf("Nessuna revisione parassata da %s", normalizedPath)
	}
}
