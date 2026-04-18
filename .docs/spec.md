Questa è la **Specifica di Progettazione Tecnica (v2.0)** per **RadiantCL1**. Questo documento funge da *Blueprint* definitivo e guida tecnica per lo sviluppo e l'integrazione dell'IA.

---

# 📜 RadiantCL1: Technical Design Specification (v2.0)

## *The Blueprint*

> *"Qualsiasi sistema abbastanza complesso può essere analizzato, e l'ordine può essere trovato là dove sembrava regnare solo il caso."* — **Hari Seldon (H. Asimov)**

## 1. Visione del Prodotto

**RadiantCL1** non è un semplice emulatore di terminale; è un **ambiente di analisi semantica per il networking**. L'obiettivo è trasformare il flusso di testo piatto (CLI) in un set di dati strutturati e interattivi, fornendo agli ingegneri di rete una "visione aumentata" della propria infrastruttura attraverso un'integrazione profonda con l'IA.

---

## 2. Architettura Tecnica & Stack

### 2.1. Core Engine & Framework

* **Backend:** **Wails (v2, v3 appena stabile)** (Go) — Per un eseguibile nativo multi-finestra ultra-leggero, gestendo la logica di sistema e le connessioni SSH/Telnet ad alte prestazioni.
* **UI Engine:** **React** — Interfaccia fluida e reattiva ispirata ai moderni IDE.
* **Terminal:** **Xterm.js** — Per la resa fedele dei caratteri e il supporto ANSI.
* **Config Editor:** **Monaco Editor** — Gestione professionale di configurazioni e codice con evidenziazione sintattica.
* **Parsing Semantico:** **Tree-sitter** — Utilizzo di grammatiche specializzate (Cisco, Juniper, Arista) per la comprensione del testo in tempo reale.

### 2.2. Sistema di Storage Ibrido

La persistenza dei dati è divisa in due layer specializzati:

1. **Vault Storico (jj + Git):**
    * Utilizzo di **Jujutsu (jj)** con backend Git per log e configurazioni.
    * Ogni interazione "Prompt-to-Prompt" genera un **micro-commit atomico**.
    * Tag e commenti utente salvati come messaggi di commit o Git Tags per la massima interoperabilità.
2. **Analytic Index (SQLite):**
    * Database **SQLite (JSONB)** per le metriche estratte (numeri, stati, tabelle MAC/Routing).
    * Alimenta i grafici Sparkline e i checkup di salute comparativi.

---

## 3. Funzionalità Avanzate del Backend (Go)

L'engine in Go funge da **Middleware Semantico** (The Seldon Engine) con capacità proattive:

* **Auto-Discovery Engine:** All'handshake SSH, invia automaticamente una sequenza di comandi discovery (`sh run`, `sh ip route`, `sh inventory`, ecc.) e popola l'Analytic Index in background.
* **Anti-Lockout Logic:** Analizza l'input dell'utente prima dell'invio. Se il comando impatta il "Management Path" (IP sorgente o interfaccia di ingresso), intercetta l'invio e richiede una conferma esplicita.
* **Syslog Redirector:** Riconosce i pattern dei messaggi `%SYS-` e li invia a un thread Wails separato per la visualizzazione in una sidebar dedicata ai log.
* **Protocol Handler:** Registrazione a livello OS per gestire schemi URI `ssh://`, `telnet://` e il protocollo custom `rad://`.

---

## 4. Frontend & User Experience (React)

L'interfaccia trasforma l'output testuale in un'esperienza visiva ricca:

* **Replay Player:** Componente per scorrere le revisioni Jujutsu (jj) di una sessione, permettendo la navigazione temporale nell'output della console.
* **Visualizzazione Trend:** Integrazione di librerie grafiche (es. Recharts) nei tooltip per mostrare dati storici (Sparkline) estratti da SQLite.
* **Semantic Highlighting:** Feedback visivo dinamico (lampeggio o colorazione) basato sulla comparazione tra il valore attuale e lo stato precedente salvato nel DB.
* **Contextual Sidebar:** Pannello laterale popolato automaticamente con i dati estratti dall'Auto-Discovery (Stato interfacce, Modello, Versione).

---

## 5. Deployment & Portabilità

* **Static Binary:** Compilazione statica con binari di supporto (come `jj`) incorporati via `embed`.
* **File-Centric:** I dati rimangono organizzati in `/vault/hostname/sessions/`, garantendo l'accesso e il backup anche tramite file explorer standard.
* **Privacy-First:** Tutti i dati rimangono locali sulla macchina dell'utente.

---

## 6. Struttura del Repository

```text
/radiantcl1
├── /main.go             # Entry point Wails e setup protocolli
├── /backend             # Logica in Go
│   ├── /discovery       # Auto-Discovery Engine
│   ├── /vault           # Integrazione Jujutsu
│   ├── /db              # Analytic Index (SQLite)
│   ├── /parser          # Tree-sitter Middleware
│   └── /protocols       # Deep linking & SSH/Telnet
├── /frontend            # React App
│   ├── /src/components  # Terminal, ReplayPlayer, Sidebar
│   ├── /src/charts      # Visualizzazione Trend
│   └── /src/theme       # Design System "Radiante"
└── /embed               # Binari esterni e risorse incorporate
```

---

## 7. Filosofia di Sviluppo

* **Atomic Single-Pass:** Estrazione dati e trasformazioni in un unico passaggio atomico.
* **Identità Deterministica:** Identificatori stabili per i dati estratti.
* **Open Access:** Interoperabilità totale con strumenti Git standard.

---
