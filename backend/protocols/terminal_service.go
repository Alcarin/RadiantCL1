package protocols

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
	"os"
	"path/filepath"
	"radiantcl1/backend/db"
	"regexp"
	"strings"
	"time"
)

// ansiRegex copre sequenze CSI (colori/movimento) e OSC (titoli finestra/altre info OS)
var ansiRegex = regexp.MustCompile(`[\x1b\x9b]([[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|](([0-9]+(;[^\x07\x1b]*))?(\x07|\x1b\\)))`)

func stripANSI(data []byte) []byte {
	// 1. Rimuovi sequenze ANSI e OSC
	clean := ansiRegex.ReplaceAll(data, []byte(""))

	// 2. Normalizza i ritorni a capo e rimuovi i Carriage Return (\r)
	// Molti terminali inviano \r\n, che in un editor di testo diventa una doppia riga o riga sporca
	str := strings.ReplaceAll(string(clean), "\r\n", "\n")
	str = strings.ReplaceAll(str, "\r", "")

	// 3. Rimuovi caratteri di controllo speciali residui (come il BEL \x07)
	str = strings.ReplaceAll(str, "\x07", "")

	return []byte(str)
}

// TerminalSession rappresenta una sessione attiva (SSH o Telnet)
type TerminalSession struct {
	ID        string
	Type      string // "ssh" | "telnet"
	Name      string
	Address   string
	Conn      net.Conn
	SSHClient *ssh.Client
	SSHSession *ssh.Session
	Writer    io.Writer
	Ctx       context.Context
	Cancel    context.CancelFunc
	mu        sync.Mutex
	buffer    []byte
	isReady   bool
	logger    *os.File
	lastDir   string // "RadiantCL1 -> Host" | "Host -> RadiantCL1"
	timer     *time.Timer
	dirty     bool
	Status    string // "connected" | "disconnected"
	Icon      string
	HostID    int64
}

// SessionInfo è il DTO per il frontend
type SessionInfo struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Host    string `json:"host"`
	Type    string `json:"type"`
	Status  string `json:"status"`
	Icon    string `json:"icon"`
}

type TerminalService struct {
	ctx      context.Context
	sessions map[string]*TerminalSession
	mu       sync.RWMutex
	IsTest   bool
	jj       *JJService
}

func NewTerminalService() *TerminalService {
	return &TerminalService{
		sessions: make(map[string]*TerminalSession),
		jj:       NewJJService(),
	}
}

func (s *TerminalService) SetContext(ctx context.Context) {
	s.ctx = ctx
	s.jj.SetContext(ctx)
}

func (s *TerminalService) emit(name string, data ...interface{}) {
	if !s.IsTest && s.ctx != nil {
		runtime.EventsEmit(s.ctx, name, data...)
	}
}

func (s *TerminalService) logError(format string, args ...interface{}) {
	if !s.IsTest && s.ctx != nil {
		runtime.LogErrorf(s.ctx, format, args...)
	}
}

// ConnectSSH avvia una connessione SSH con feedback granulare
func (s *TerminalService) ConnectSSH(id string, hostID int64, name string, icon string, address string, port int, user string, password string) {
	// 1. Crea la sessione in stato connecting
	ctx, cancel := context.WithCancel(s.ctx)
	ts := &TerminalSession{
		ID:      id,
		Type:    "ssh",
		Name:    name,
		Address: address,
		Ctx:     ctx,
		Cancel:  cancel,
		Status:  "connecting",
		Icon:    icon,
		HostID:  hostID,
	}

	s.mu.Lock()
	s.sessions[id] = ts
	s.mu.Unlock()
	s.emit("terminal:sessions-updated")

	go func() {
		defer func() {
			if r := recover(); r != nil {
				s.logError("Recovered from panic in ConnectSSH: %v", r)
				s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("Panic: %v", r)})
			}
		}()

		config := &ssh.ClientConfig{
			User: user,
			Auth: []ssh.AuthMethod{
				ssh.Password(password),
				ssh.KeyboardInteractive(func(user, instruction string, questions []string, echos []bool) ([]string, error) {
					answers := make([]string, len(questions))
					for i := range questions {
						answers[i] = password
					}
					return answers, nil
				}),
			},
			HostKeyCallback: ssh.InsecureIgnoreHostKey(),
			Timeout:         10 * time.Second,
		}

		addr := fmt.Sprintf("%s:%d", address, port)

		// STEP: TCP Connection
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "tcp"})
		
		dialer := net.Dialer{Timeout: 10 * time.Second}
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("TCP Error: %v", err)})
			s.RemoveSession(id)
			return
		}
		ts.Conn = conn

		// STEP: Handshake
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "handshake"})
		sshConn, chans, reqs, err := ssh.NewClientConn(conn, addr, config)
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("SSH Handshake Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		// STEP: Authentication
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "auth"})
		client := ssh.NewClient(sshConn, chans, reqs)
		ts.SSHClient = client

		// STEP: Session Creation
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "encrypt"}) // "Cifratura canale completata" (metaforicamente qui)
		session, err := client.NewSession()
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("SSH Session Error: %v", err)})
			s.RemoveSession(id)
			return
		}
		ts.SSHSession = session

		// STEP: PTY/Shell
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "pty"})
		modes := ssh.TerminalModes{
			ssh.ECHO:          1,
			ssh.TTY_OP_ISPEED: 14400,
			ssh.TTY_OP_OSPEED: 14400,
		}

		if err := session.RequestPty("xterm-256color", 80, 24, modes); err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("PTY Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		stdin, err := session.StdinPipe()
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("Stdin Pipe Error: %v", err)})
			s.RemoveSession(id)
			return
		}
		ts.Writer = stdin

		stdout, err := session.StdoutPipe()
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("Stdout Pipe Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		stderr, err := session.StderrPipe()
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("Stderr Pipe Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "shell"})
		if err := session.Shell(); err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("Shell Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		// FINISHED
		ts.mu.Lock()
		ts.Status = "connected"
		ts.mu.Unlock()

		// Setup logging
		s.setupLogging(ts)

		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "ready"})
		s.emit("terminal:sessions-updated")

		// Avvia i loop di lettura
		go s.readLoop(ts, stdout)
		go s.readLoop(ts, stderr)

		// Monitora la chiusura effettiva della sessione
		go func() {
			session.Wait()
			s.CloseSession(id)
		}()
	}()
}

// ConnectTelnet avvia una connessione Telnet con feedback
func (s *TerminalService) ConnectTelnet(id string, hostID int64, name string, icon string, address string, port int) {
	ctx, cancel := context.WithCancel(s.ctx)
	ts := &TerminalSession{
		ID:      id,
		Type:    "telnet",
		Name:    name,
		Address: address,
		Ctx:     ctx,
		Cancel:  cancel,
		Status:  "connecting",
		Icon:    icon,
		HostID:  hostID,
	}

	s.mu.Lock()
	s.sessions[id] = ts
	s.mu.Unlock()
	s.emit("terminal:sessions-updated")

	go func() {
		addr := fmt.Sprintf("%s:%d", address, port)
		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "tcp"})
		
		dialer := net.Dialer{Timeout: 10 * time.Second}
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err != nil {
			s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "error", "message": fmt.Sprintf("TCP Error: %v", err)})
			s.RemoveSession(id)
			return
		}

		ts.Conn = conn
		ts.Writer = conn
		ts.Status = "connected"

		// Setup logging
		s.setupLogging(ts)

		s.emit("terminal:progress", map[string]interface{}{"id": id, "step": "ready"})
		s.emit("terminal:sessions-updated")

		go s.telnetReadLoop(ts)
	}()
}

func (s *TerminalService) readLoop(ts *TerminalSession, r io.Reader) {
	buf := make([]byte, 1024*4)
	for {
		select {
		case <-ts.Ctx.Done():
			return
		default:
			n, err := r.Read(buf)
			if n > 0 {
				s.logData(ts, ts.Name+" -> RadiantCL1", buf[:n])
				ts.mu.Lock()
				if ts.isReady {
					ts.mu.Unlock()
					s.emit("terminal:data:"+ts.ID, string(buf[:n]))
				} else {
					ts.buffer = append(ts.buffer, buf[:n]...)
					ts.mu.Unlock()
				}
			}
			if err != nil {
				if err != io.EOF {
					s.logError("Read error: %v", err)
				}
				// Non chiamiamo CloseSession qui, attendiamo il monitor della sessione o il contesto
				return
			}
		}
	}
}

const (
	telnetIAC  = 255
	telnetDONT = 254
	telnetDO   = 253
	telnetWONT = 252
	telnetWILL = 251
)

func (s *TerminalService) telnetReadLoop(ts *TerminalSession) {
	reader := bufio.NewReader(ts.Conn)
	for {
		b, err := reader.ReadByte()
		if err != nil {
			s.CloseSession(ts.ID)
			return
		}

		if b == telnetIAC {
			// Negoziazione Telnet
			cmd, _ := reader.ReadByte()
			opt, _ := reader.ReadByte()

			// Rispondi in modo conservativo (WONT/DONT)
			var response []byte
			switch cmd {
			case telnetDO:
				response = []byte{telnetIAC, telnetWONT, opt}
			case telnetWILL:
				response = []byte{telnetIAC, telnetDONT, opt}
			}
			if response != nil {
				ts.Conn.Write(response)
			}
			continue
		}

		// Dato normale
		s.logData(ts, ts.Name+" -> RadiantCL1", []byte{b})
		ts.mu.Lock()
		if ts.isReady {
			ts.mu.Unlock()
			s.emit("terminal:data:"+ts.ID, string([]byte{b}))
		} else {
			ts.buffer = append(ts.buffer, b)
			ts.mu.Unlock()
		}
		
		// Leggi il resto se disponibile per ottimizzare gli eventi
		if reader.Buffered() > 0 {
			peeked, _ := reader.Peek(reader.Buffered())
			// Cerca il prossimo IAC
			count := 0
			for i, pb := range peeked {
				if pb == telnetIAC {
					break
				}
				count = i + 1
			}
			if count > 0 {
				actual := make([]byte, count)
				reader.Read(actual)
				s.logData(ts, ts.Name+" -> RadiantCL1", actual)
				ts.mu.Lock()
				if ts.isReady {
					ts.mu.Unlock()
					s.emit("terminal:data:"+ts.ID, string(actual))
				} else {
					ts.buffer = append(ts.buffer, actual...)
					ts.mu.Unlock()
				}
			}
		}
	}
}

func (s *TerminalService) SendData(id string, data string) error {
	s.mu.RLock()
	ts, ok := s.sessions[id]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("session %s not found", id)
	}

	s.logData(ts, "RadiantCL1 -> "+ts.Name, []byte(data))
	_, err := ts.Writer.Write([]byte(data))
	return err
}

func (s *TerminalService) ResizeTerminal(id string, cols, rows int) error {
	s.mu.RLock()
	ts, ok := s.sessions[id]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("session %s not found", id)
	}

	if ts.Type == "ssh" && ts.SSHSession != nil {
		return ts.SSHSession.WindowChange(rows, cols)
	}
	
	return nil
}

func (s *TerminalService) GetSessions() []SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]SessionInfo, 0, len(s.sessions))
	for _, ts := range s.sessions {
		sessions = append(sessions, SessionInfo{
			ID:     ts.ID,
			Name:   ts.Name,
			Host:   ts.Address,
			Type:   ts.Type,
			Status: ts.Status,
			Icon:   ts.Icon,
		})
	}
	return sessions
}

func (s *TerminalService) RemoveSession(id string) {
	s.mu.Lock()
	ts, ok := s.sessions[id]
	if ok {
		delete(s.sessions, id)
	}
	s.mu.Unlock()

	if ok && ts.Status == "connected" {
		s.CloseSession(id)
	}

	s.emit("terminal:sessions-updated")
}

func (s *TerminalService) CloseSession(id string) {
	s.mu.Lock()
	ts, ok := s.sessions[id]
	if ok {
		ts.Status = "disconnected"
	}
	s.mu.Unlock()

	if ok {
		ts.Cancel()
		if ts.SSHSession != nil {
			ts.SSHSession.Close()
		}
		if ts.SSHClient != nil {
			ts.SSHClient.Close()
		}
		if ts.Conn != nil {
			ts.Conn.Close()
		}
		if ts.logger != nil {
			ts.logger.Close()
			// Commit finale alla chiusura della sessione solo se ci sono dati pendenti
			if ts.dirty {
				ts.dirty = false
				s.jj.Commit(ts.ID, ts.Name, "Session Closed")
			}
		}
		s.emit("terminal:closed:"+id)
		s.emit("terminal:sessions-updated")
	}
}

// UpdateHostMetadata aggiorna il nome e l'icona per tutte le sessioni associate a un hostID
func (s *TerminalService) UpdateHostMetadata(hostID int64, name, icon string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	updated := false
	for _, ts := range s.sessions {
		if ts.HostID == hostID {
			ts.Name = name
			ts.Icon = icon
			updated = true
		}
	}

	if updated {
		s.emit("terminal:sessions-updated")
	}
}

func (s *TerminalService) MarkReady(id string) {
	s.mu.RLock()
	ts, ok := s.sessions[id]
	s.mu.RUnlock()

	if ok {
		ts.mu.Lock()
		defer ts.mu.Unlock()
		if ts.isReady {
			return
		}
		if len(ts.buffer) > 0 {
			s.emit("terminal:data:"+ts.ID, string(ts.buffer))
			ts.buffer = nil
		}
		ts.isReady = true
	}
}

// setupLogging inizializza il file di log per una sessione
func (s *TerminalService) setupLogging(ts *TerminalSession) {
	logDir, err := db.GetLogDir(ts.Name)
	if err != nil {
		s.logError("Failed to get log dir for %s: %v", ts.Name, err)
		return
	}

	timestamp := time.Now().Format("20060102_150405")
	logPath := filepath.Join(logDir, fmt.Sprintf("session_%s.log", timestamp))

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		s.logError("Failed to open log file %s: %v", logPath, err)
		return
	}

	ts.logger = f
	
	// Inizializza il repository jj
	go func() {
		if err := s.jj.InitRepo(); err != nil {
			s.logError("Failed to init jj repo: %v", err)
		}
	}()
}

// logData scrive i dati sul file di log e gestisce il trigger dei commit jj
func (s *TerminalService) logData(ts *TerminalSession, direction string, data []byte) {
	if ts.logger == nil {
		return
	}

	// Pulisci i codici ANSI per il log su disco per renderlo leggibile
	cleanData := stripANSI(data)
	if len(cleanData) == 0 {
		return // Se erano solo codici di controllo (colori, ecc), non scriviamo nulla
	}

	// NUOVA LOGICA: Per evitare il raddoppio dei caratteri (echo), scriviamo sul file 
	// fisico di log solo i dati provenienti dall'Host verso RadiantCL1.
	// Poiché il server esegue l'echo di ciò che digitiamo, avremo comunque il transcript completo.
	isOutgoing := strings.HasPrefix(direction, "RadiantCL1")
	
	if !isOutgoing {
		// Scrivi sul file fisico solo se è un dato ricevuto (include echo)
		_, _ = ts.logger.Write(cleanData)
		
		ts.mu.Lock()
		ts.dirty = true
		ts.mu.Unlock()
	}

	// Gestione commit jj
	ts.mu.Lock()
	defer ts.mu.Unlock()

	// Aggiorniamo la direzione dell'ultima attività per il messaggio del commit
	ts.lastDir = direction

	// Reset del timer di idle (1 secondo) per il commit automatico
	if ts.timer != nil {
		ts.timer.Stop()
	}

	ts.timer = time.AfterFunc(1*time.Second, func() {
		ts.mu.Lock()
		defer ts.mu.Unlock()
		if ts.dirty && ts.lastDir != "" {
			dir := ts.lastDir
			ts.dirty = false
			s.jj.Commit(ts.ID, ts.Name, dir)
		}
	})
}
