Questa è la **Specifica di Progettazione Tecnica (v1.0)** per **RadiantCL1**. Puoi usarla come documento di base (*Blueprint*) da dare in pasto all'IA per generare il codice o per strutturare il repository GitHub.

---

# 📜 RadiantCL1: Technical Design Specification

> *"Qualsiasi sistema abbastanza complesso può essere analizzato, e l'ordine può essere trovato là dove sembrava regnare solo il caso."* — **Hari Seldon (H. Asimov)**

## 1. Visione del Prodotto

**RadiantCL1** non è un emulatore di terminale; è un **ambiente di analisi semantica per il networking**. L'obiettivo è trasformare il flusso di testo piatto (CLI) in un set di dati strutturati e interattivi, fornendo agli ingegneri di rete una "visione aumentata" della propria infrastruttura.

---

## 2. Lo Stack Tecnologico

* **Core Engine (Backend):** Go (Golang) — Scelto per la gestione nativa dei protocolli (SSH/Telnet) e la velocità di elaborazione dei dati (Goroutines).
* **Framework Desktop:** **Wails (v3)** — Per creare un binario nativo leggero, portabile e multi-finestra utilizzando un frontend web.
* **Interfaccia Utente (Frontend):** **React + TailwindCSS** — Layout ispirato a VS Code per la massima familiarità.
* **Terminal Core:** **Xterm.js** — Per la resa fluida dei caratteri e il supporto ANSI.
* **Editor di Configurazione:** **Monaco Editor** — Il cuore di VS Code integrato per visualizzare backup e diff.
* **Parser Sintattico:** **Tree-sitter** (con grammatiche Cisco/Juniper/Arista) — Per trasformare il testo in un albero sintattico (AST).

---

## 3. Architettura di Sistema: "The Seldon Engine"

L'architettura si basa sul concetto di **Middleware Semantico**. Ogni carattere inviato o ricevuto passa attraverso un "Cervello" in Go prima di arrivare a video.

### A. Stream Processor (Go)

1. **Intercept:** Cattura l'output del device (es. Cisco IOS).
2. **Parse:** Invia il testo a **Tree-sitter**. Se riconosce un pattern (es. un IP, un'interfaccia, un log di errore), marca quei dati con dei metadati.
3. **Route:**
    * Se è un comando digitato $\rightarrow$ Terminale Principale.
    * Se è un Syslog (`%...`) $\rightarrow$ Canale **Log Splitter** (Finestra/Scheda dedicata).
    * Se è un output di stato (`show run`) $\rightarrow$ Archiviazione per la **Time Machine**.

### B. Radiant UI (React)

* **Hover Provider:** Al passaggio del mouse su un IP marcato dal backend, React apre un tooltip che interroga Go per mostrare la rotta di routing o l'ultima volta che quell'IP è stato visto.
* **Contextual Sidebar:** Un pannello laterale che si popola automaticamente con le informazioni dell'apparato a cui sei collegato (Modello, Versione, Stato interfacce).

---

## 4. Funzionalità Chiave (Dettaglio Tecnico)

### 4.1. Intelligent Log Detach

* **Meccanismo:** Il backend identifica i messaggi di logging tramite Regex/Tree-sitter.
* **Azione:** Invece di "sporcare" la riga di comando attiva, RadiantCL1 invia i log a un thread separato.
* **Visualizzazione:** Una scheda "Monitor" o una finestra pop-out (Wails Window Management) che visualizza i log in tempo reale con scrolling indipendente.

### 4.2. Deep Linking Portabile (`rad://`)

* **Registrazione:** Al boot, il binario Go controlla la sua posizione e registra se stesso come gestore per `ssh://`, `telnet://` e il protocollo custom `rad://`.
* **Integrazione Web:** Permette di lanciare sessioni direttamente da dashboard esterne o documentazione tecnica.

### 4.3. Git-Powered "Time Machine"

* **Auto-Commit:** Ogni volta che viene rilevato un cambio di configurazione o un output di comando critico, Go salva il testo in una directory locale nascosta gestita come un repository Git.
* **Instant Diff:** Il terminale permette di fare il diff tra l'output attuale di un comando e l'ultima esecuzione (es. `show ip route` di oggi vs ieri).

### 4.4. Validazione "Pre-Volo"

* **Analisi Semantica:** Prima di inviare il tasto INVIO per comandi pericolosi (es. `reload`, `shutdown`), l'engine analizza il comando.
* **Warning:** Se il comando ha un impatto critico rilevato (es. shutdown su una porta trunk attiva), RadiantCL1 blocca l'invio e richiede una conferma visiva "extra" nel frontend.

---

## 5. Struttura del Repository (Suggerita)

```text
/radiantcl1
├── /main.go             # Entry point Wails e setup protocolli
├── /backend             # Logica in Go
│   ├── /ssh             # Gestione sessioni e Keep-alive
│   ├── /parser          # Integrazione Tree-sitter (Seldon Engine)
│   ├── /git             # Gestione versionamento automatico
│   └── /protocols       # Deep linking (Windows/Linux/macOS)
├── /frontend            # React App
│   ├── /src/components  # Terminal, Sidebar, Monaco Editor
│   ├── /src/hooks       # Gestione eventi Wails
│   └── /src/theme       # Neon-Dark "Asimov" style
└── /build               # Risorse per la compilazione portabile
```

---

## 6. Filosofia di Sviluppo (Il Regalo)

* **Licenza:** MIT o Apache 2.0 (Open Source).
* **Trasparenza:** Nessun dato lascia mai la macchina dell'ingegnere. La telemetria è assente.
* **IA-First:** Il codice è scritto per essere modulare, permettendo all'utente di aggiungere "Grammar" Tree-sitter per nuovi vendor in modo dichiarativo.

---

### Prossimo Passo Consigliato

Vuoi che proviamo a scrivere il **"Hello World"** del backend in Go per gestire la prima connessione SSH o preferisci definire prima il **tema estetico** (CSS/Tailwind) per la "Radiante UI"?
