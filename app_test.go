package main

import (
	"context"
	"radiantcl1/backend/protocols"
	"testing"
)

// MockTerminalService per i test di App
type MockTerminalService struct {
	sessions []protocols.SessionInfo
}

func (m *MockTerminalService) GetSessions() []protocols.SessionInfo {
	return m.sessions
}

func TestApp_GetActiveConnections(t *testing.T) {
	app := &App{}
	
	// Caso 1: terminalService nil
	sessions := app.GetActiveConnections()
	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions when terminalService is nil, got %d", len(sessions))
	}

	// Caso 2: terminalService con sessioni
	// Nota: nella realtà terminalService è una struct concreta in App
	// ma qui per semplicità iniettiamo se possibile o usiamo l'originale
	
	// Siccome App.terminalService è un puntatore alla struct concreta, 
	// non posso iniettare facilmente un mock senza cambiare il tipo in interfaccia.
	// Per ora testiamo con la struct reale ma vuota.
	app.terminalService = protocols.NewTerminalService()
	app.terminalService.SetContext(context.Background())
	
	sessions = app.GetActiveConnections()
	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions, got %d", len(sessions))
	}
}
