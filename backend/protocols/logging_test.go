package protocols

import (
	"os"
	"strings"
	"testing"
)

func TestStripANSI(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Base color codes",
			input:    "\x1b[01;32mfrubeo@debian\x1b[00m",
			expected: "frubeo@debian",
		},
		{
			name:     "OSC title sequence",
			input:    "\x1b]0;frubeo@debian: ~\x07frubeo@debian:~$",
			expected: "frubeo@debian:~$",
		},
		{
			name:     "Multiple lines and \r\n",
			input:    "Line 1\r\nLine 2\r\n",
			expected: "Line 1\nLine 2\n",
		},
		{
			name:     "Isolated \r and BEL",
			input:    "Command\rOutput\x07",
			expected: "CommandOutput",
		},
		{
			name:     "Complex prompt example",
			input:    "\x1b]0;frubeo@debian: ~\x07\x1b[01;32mfrubeo@debian\x1b[00m:\x1b[01;34m~\x1b[00m$ ",
			expected: "frubeo@debian:~$ ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(stripANSI([]byte(tt.input)))
			if got != tt.expected {
				t.Errorf("stripANSI() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestJJEmbedding(t *testing.T) {
	data, name := getEmbeddedJJ()
	if len(data) == 0 {
		t.Fatal("Embedded JJ binary data is empty")
	}
	if name == "" {
		t.Error("Embedded JJ binary name is empty")
	}
	t.Logf("Embedded binary for current platform: %s (%d bytes)", name, len(data))
}

func TestLogDataLogic(t *testing.T) {
	// Setup a temporary file for logging
	tmpFile, err := os.CreateTemp("", "radiant_test_*.log")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpFile.Name())

	ts := &TerminalSession{
		ID:     "test-id",
		Name:   "TestHost",
		logger: tmpFile,
	}

	service := NewTerminalService()
	service.IsTest = true

	// Test Outgoing data (should NOT be written to the log file)
	service.logData(ts, "RadiantCL1 -> TestHost", []byte("command"))
	
	// Test Incoming data (SHOULD be written to the log file)
	service.logData(ts, "TestHost -> RadiantCL1", []byte("output"))

	// Close to flush
	tmpFile.Close()

	// Read content
	content, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(string(content), "command") {
		t.Error("Log file contains outgoing data (echo), but it should be filtered")
	}
	if !strings.Contains(string(content), "output") {
		t.Error("Log file does not contain incoming host data")
	}
}
