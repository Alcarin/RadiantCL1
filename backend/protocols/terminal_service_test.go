package protocols

import (
	"context"
	"testing"
)

func TestTerminalService_GetSessions(t *testing.T) {
	ts := NewTerminalService()
	ts.IsTest = true
	ts.SetContext(context.Background())

	// Test empty sessions
	sessions := ts.GetSessions()
	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions, got %d", len(sessions))
	}

	// Add a session manually for testing (since Connect involves networking)
	sessionID := "test-session"
	ts.mu.Lock()
	ts.sessions[sessionID] = &TerminalSession{
		ID:      sessionID,
		Name:    "Test Host",
		Address: "1.2.3.4",
		Type:    "ssh",
		Status:  "connected",
	}
	ts.mu.Unlock()

	sessions = ts.GetSessions()
	if len(sessions) != 1 {
		t.Errorf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].ID != sessionID {
		t.Errorf("expected ID %s, got %s", sessionID, sessions[0].ID)
	}
	if sessions[0].Name != "Test Host" {
		t.Errorf("expected Name 'Test Host', got '%s'", sessions[0].Name)
	}
}

func TestTerminalService_CloseSession(t *testing.T) {
	ts := NewTerminalService()
	ts.IsTest = true
	ts.SetContext(context.Background())

	sessionID := "to-close"
	ctx, cancel := context.WithCancel(context.Background())
	ts.mu.Lock()
	ts.sessions[sessionID] = &TerminalSession{
		ID:     sessionID,
		Ctx:    ctx,
		Cancel: cancel,
		Status: "connected",
	}
	ts.mu.Unlock()

	ts.CloseSession(sessionID)

	ts.mu.RLock()
	s, ok := ts.sessions[sessionID]
	ts.mu.RUnlock()

	if !ok {
		t.Fatal("session was unexpectedly removed after CloseSession")
	}
	if s.Status != "disconnected" {
		t.Errorf("expected status 'disconnected', got '%s'", s.Status)
	}
}

func TestTerminalService_RemoveSession(t *testing.T) {
	ts := NewTerminalService()
	ts.IsTest = true
	ts.SetContext(context.Background())

	sessionID := "to-remove"
	ctx, cancel := context.WithCancel(context.Background())
	ts.mu.Lock()
	ts.sessions[sessionID] = &TerminalSession{
		ID:     sessionID,
		Ctx:    ctx,
		Cancel: cancel,
		Status: "connected",
	}
	ts.mu.Unlock()

	ts.RemoveSession(sessionID)

	ts.mu.RLock()
	_, ok := ts.sessions[sessionID]
	ts.mu.RUnlock()

	if ok {
		t.Error("session was not removed after RemoveSession")
	}
}
