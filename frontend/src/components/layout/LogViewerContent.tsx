import React, { useEffect, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { PreloadLogFrames } from '../../../wailsjs/go/main/App';
import { EventsOn, EventsEmit } from '../../../wailsjs/runtime/runtime';
import { playbackStore } from '../../stores/playbackStore';

interface LogViewerContentProps {
  content: string;
  tabId: string;
  host: string;
  filename: string;
}

export const LogViewerContent: React.FC<LogViewerContentProps> = ({
  content: initialContent,
  tabId,
  host,
  filename
}) => {
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [frames, setFrames] = useState<any[]>([]);

  // ── Stato riproduzione: ref (loop senza stale closure) + state (re-render) + store (UI via rAF) ──
  const [isPlayingState, _setIsPlayingRaw] = useState(false);
  const isPlayingRef = useRef(false);
  const setIsPlaying = useCallback((val: boolean) => {
    isPlayingRef.current = val;
    playbackStore.isPlaying = val;  // letto da HistoryView via rAF, zero Go
    _setIsPlayingRaw(val);
  }, []);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeedRef = useRef(1);

  // ── Posizione corrente: ref + state sincronizzati ──
  const [currentIndexState, _setCurrentIndexRaw] = useState(0);
  const currentIndexRef = useRef(0);
  const setCurrentIndex = useCallback((val: number | ((prev: number) => number)) => {
    _setCurrentIndexRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      currentIndexRef.current = next;
      return next;
    });
  }, []);

  // Trigger per far ripartire il loop quando displayFrame carica un nuovo frame
  const [frameAdvanceTick, setFrameAdvanceTick] = useState(0);

  // ── Refs stabili per loop e contenuto ──
  const typeQueueRef = useRef<string[]>([]);
  const baseContentRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const marksRef = useRef<number[]>([]);
  const totalLinesRef = useRef<number>(0);
  const framesRef = useRef<any[]>([]);

  const editorRef = useRef<any>(null);
  const decorationIdsRef = useRef<string[]>([]);  // Monaco decoration IDs per i commit markers

  // ── Applica decorazioni gutter: punto gold + hover tooltip su ogni riga di commit ──
  const applyCommitDecorations = useCallback(() => {
    if (!editorRef.current || framesRef.current.length === 0) return;
    const marks = marksRef.current;
    const frames = framesRef.current;

    const decorations = marks.map((mark, i) => {
      const f = frames[i];
      const ts = f.timestamp ? new Date(String(f.timestamp)).toLocaleString(undefined, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }) : '';
      const parts = (f.message || '').split(' | ');
      const direction = parts.length >= 3 ? parts.slice(2).join(' | ') : (f.message || '');
      const hoverMd = ts ? `**${ts}**\n\n${direction}` : direction;
      return {
        range: { startLineNumber: mark, startColumn: 1, endLineNumber: mark, endColumn: 1 },
        options: {
          glyphMarginClassName: 'rd-commit-glyph',
          glyphMarginHoverMessage: { value: hoverMd },
          className: 'rd-commit-line',
          overviewRuler: { color: '#fde04780', position: 4 },
        }
      };
    });

    // deltaDecorations: rimpiazza le precedenti (safe anche se vuoto)
    decorationIdsRef.current = editorRef.current.deltaDecorations(
      decorationIdsRef.current,
      decorations
    );
  }, []);

  // ── Bulk Preload: unica chiamata al backend, poi tutto è JS ──
  useEffect(() => {
    let isMounted = true;
    const preload = async () => {
      console.log(`[LogViewer] Preloading frames for ${host}/${filename}...`);
      try {
        const loadedFrames = await PreloadLogFrames(host, filename);
        if (!isMounted) return;

        const safeFrames = loadedFrames || [];
        setFrames(safeFrames);
        framesRef.current = safeFrames;

        let initialFull = '';
        let runningLines = 0;
        const marks: number[] = [];
        const messages: string[] = [];
        const timestamps: string[] = [];

        for (const f of safeFrames) {
          initialFull += f.delta;
          const deltaLines = f.delta === '' ? 0 : f.delta.split('\n').length - 1;
          runningLines += deltaLines;
          marks.push(runningLines);
          messages.push(f.message);
          // timestamp è un time.Time serializzato da Go come stringa ISO 8601
          timestamps.push(f.timestamp ? String(f.timestamp) : '');
        }

        if (runningLines === 0 && initialFull.length > 0) runningLines = 1;

        baseContentRef.current = initialFull;
        marksRef.current = marks;
        totalLinesRef.current = runningLines;

        // ── Popola lo store: da qui in poi la riproduzione è tutta JS, zero Go ──
        playbackStore.totalLines = runningLines;
        playbackStore.currentLine = runningLines;
        playbackStore.frameMarks = marks;
        playbackStore.frameMessages = messages;
        playbackStore.frameTimestamps = timestamps;
        playbackStore.isPlaying = false;

        setDisplayContent(initialFull);
        setCurrentIndex(runningLines);

        // app:playback:init: unico evento Wails giustificato (bassa frequenza, una sola volta)
        // Serve a HistoryView per aggiornare gli stati React (sliderMax, frameMarks per i tick marks)
        EventsEmit('app:playback:init', { totalLines: runningLines, marks, messages, timestamps, tabId });

        // Decorazioni: schedulare su rAF per garantire che il Monaco model sia aggiornato
        requestAnimationFrame(() => applyCommitDecorations());

      } catch (err) {
        if (!isMounted) return;
        console.error('[LogViewer] Preload failed:', err);
      }
    };
    preload();
    return () => { isMounted = false; };
  }, [host, filename, setCurrentIndex]);

  // ── displayFrame: STABILE — legge solo da refs, nessuna stale closure ──
  const displayFrame = useCallback((targetLine: number, instant: boolean = false) => {
    const currentFrames = framesRef.current;
    if (currentFrames.length === 0) return;

    let targetFrameIdx = currentFrames.findIndex((_, idx) =>
      (marksRef.current[idx] || 0) >= targetLine || idx === currentFrames.length - 1
    );
    if (targetFrameIdx < 0) targetFrameIdx = 0;

    let prevContent = '';
    const linesBeforeTargetFrame = targetFrameIdx > 0 ? marksRef.current[targetFrameIdx - 1] : 0;
    for (let i = 0; i < targetFrameIdx; i++) {
      prevContent += currentFrames[i].delta;
    }

    const targetDelta = currentFrames[targetFrameIdx].delta;

    if (instant || !isPlayingRef.current) {
      // ── Seek istantaneo ──
      typeQueueRef.current = [];
      const lines = targetDelta.split('\n');
      const allowedLinesInDelta = Math.max(0, targetLine - linesBeforeTargetFrame);
      const textSlice =
        lines.slice(0, allowedLinesInDelta).join('\n') +
        (allowedLinesInDelta > 0 && allowedLinesInDelta < lines.length ? '\n' : '');
      const full = prevContent + textSlice;
      baseContentRef.current = full;
      setDisplayContent(full);
      setCurrentIndex(targetLine);
      playbackStore.currentLine = targetLine;  // store aggiornato sincrono → rAF lo legge al prossimo frame
    } else {
      // ── Modalità typewriter: riprende dal punto corrente ──
      const idxSnap = currentIndexRef.current;
      const startLineForTyping = Math.max(linesBeforeTargetFrame, idxSnap);
      const linesToSkipInsideFrame = startLineForTyping - linesBeforeTargetFrame;

      const targetDeltaLines = targetDelta.split('\n');
      const skippedText =
        targetDeltaLines.slice(0, linesToSkipInsideFrame).join('\n') +
        (linesToSkipInsideFrame > 0 && linesToSkipInsideFrame < targetDeltaLines.length ? '\n' : '');

      baseContentRef.current = prevContent + skippedText;
      setDisplayContent(baseContentRef.current);

      const remainingLines = targetDeltaLines.slice(linesToSkipInsideFrame);
      typeQueueRef.current = remainingLines
        .map((l: string, i: number) => i < remainingLines.length - 1 ? l + '\n' : l)
        .filter((l: string) => l.length > 0);

      setCurrentIndex(startLineForTyping);
      playbackStore.currentLine = startLineForTyping;
      setFrameAdvanceTick(prev => prev + 1); // insurance per il loop se currentIndexState non cambia
    }
  }, [setCurrentIndex]);

  // ── Event Handlers: deps stabili, registrati una sola volta ──
  // Nota: i comandi (play/pause/stop/seek/...) arrivano da HistoryView via Wails.
  // Questo è accettabile: sono azioni utente (bassa frequenza, latenza impercettibile).
  useEffect(() => {
    const handlePlay = (data: any) => {
      if (data.tabId !== tabId) return;
      if (isPlayingRef.current) return;                   // idempotente
      let newIdx = currentIndexRef.current;
      if (newIdx >= totalLinesRef.current && typeQueueRef.current.length === 0) {
        displayFrame(0, true);
        newIdx = 0;
      }
      setIsPlaying(true);
    };

    const handlePause = (data: any) => {
      if (data.tabId !== tabId) return;
      if (!isPlayingRef.current) return;                  // idempotente
      setIsPlaying(false);
    };

    const handleStop = (data: any) => {
      if (data.tabId !== tabId) return;
      setIsPlaying(false);
      typeQueueRef.current = [];
      displayFrame(0, true);
    };

    const handleSeek = (data: any) => {
      if (data.tabId !== tabId) return;
      setIsPlaying(false);
      typeQueueRef.current = [];
      displayFrame(data.value, true);
    };

    const handleNext = (data: any) => {
      if (data.tabId !== tabId) return;
      setIsPlaying(false);
      typeQueueRef.current = [];
      const nextMark = marksRef.current.find(m => m > currentIndexRef.current);
      displayFrame(nextMark ?? totalLinesRef.current, true);
    };

    const handlePrev = (data: any) => {
      if (data.tabId !== tabId) return;
      setIsPlaying(false);
      typeQueueRef.current = [];
      let prevMark = 0;
      const cIdx = currentIndexRef.current;
      for (let i = marksRef.current.length - 1; i >= 0; i--) {
        if (marksRef.current[i] < cIdx) {
          if (cIdx - marksRef.current[i] > 0) {
            prevMark = i > 0 ? marksRef.current[i - 1] : 0;
          } else {
            prevMark = marksRef.current[i];
          }
          break;
        }
      }
      if (cIdx === totalLinesRef.current && marksRef.current.length >= 2) {
        prevMark = marksRef.current[marksRef.current.length - 2];
      }
      displayFrame(prevMark, true);
    };

    const handleSpeed = (data: any) => {
      if (data.tabId !== tabId) return;
      playbackSpeedRef.current = data.value;
      setPlaybackSpeed(data.value);
    };

    const unsubs = [
      EventsOn('app:playback:play', handlePlay),
      EventsOn('app:playback:pause', handlePause),
      EventsOn('app:playback:stop', handleStop),
      EventsOn('app:playback:seek', handleSeek),
      EventsOn('app:playback:next', handleNext),
      EventsOn('app:playback:prev', handlePrev),
      EventsOn('app:playback:speed', handleSpeed)
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [tabId, displayFrame, setIsPlaying]);

  // ── Main Loop: si riavvia tramite currentIndexState o frameAdvanceTick ──
  useEffect(() => {
    if (!isPlayingState) return;

    const delay = Math.max(50, 500 / playbackSpeed);

    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return; // guard: pausa sopraggiunta durante il delay

      if (typeQueueRef.current.length > 0) {
        // ── Avanza riga per riga nella coda typewriter ──
        const chunk = typeQueueRef.current.shift()!;
        baseContentRef.current += chunk;
        setDisplayContent(baseContentRef.current);
        // Aggiorna store sincrono → rAF lo legge al prossimo frame (≤16ms), zero latenza
        const nextL = currentIndexRef.current + 1;
        playbackStore.currentLine = nextL;
        setCurrentIndex(nextL);
      } else {
        // ── Coda esaurita: avanza al prossimo frame ──
        const cIdx = currentIndexRef.current;
        const nextFrameIdx = marksRef.current.findIndex(m => m > cIdx);
        if (nextFrameIdx !== -1) {
          displayFrame(marksRef.current[nextFrameIdx], false);
        } else {
          setIsPlaying(false); // Fine del playback — store.isPlaying = false via wrapper
        }
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlayingState, currentIndexState, frameAdvanceTick, playbackSpeed, displayFrame, setCurrentIndex, setIsPlaying]);

  // ── Auto-scroll + ri-applicazione decorazioni ad ogni cambio di contenuto ──
  // Monaco cancella le decorazioni a ogni setValue() (value prop change) → le ri-applichiamo.
  // Il costo è trascurabile: deltaDecorations su N commit (di solito <10) è O(N).
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) editorRef.current.revealLine(model.getLineCount());
    }
    applyCommitDecorations();
  }, [displayContent, applyCommitDecorations]);

  return (
    <div className="flex flex-col h-full bg-rd-base relative">
      <Editor
        height="100%"
        language="text"
        theme="vs-dark"
        value={displayContent}
        onMount={(editor) => {
          editorRef.current = editor;
          // Se i frame sono già pronti (preload terminato prima del mount), applica subito
          if (framesRef.current.length > 0) applyCommitDecorations();
        }}
        options={{
          readOnly: true,
          glyphMargin: true,
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderLineHighlight: 'all',
          lineHeight: 22,
          letterSpacing: 0.4,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          links: true,
          contextmenu: true,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'auto',
            useShadows: false,
            verticalScrollbarSize: 10,
          }
        }}
      />
    </div>
  );
};
