import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { PreloadLogFrames } from '../../../wailsjs/go/main/App';
import { EventsOn, EventsEmit } from '../../../wailsjs/runtime/runtime';
import { getPlaybackStore } from '../../stores/playbackStore';
import { exportToTxt, exportToHtml } from '../../lib/exportUtils';
import { Icon } from '../ui/Icon';
import { useTranslation } from 'react-i18next';
import { editorManager } from '../../lib/editorManager';
import { parseAnsi } from '../../lib/ansiManager';

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
  const { t } = useTranslation();
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [frames, setFrames] = useState<any[]>([]);

  // Parsiamo il contenuto corrente per estrarre testo pulito e decorazioni ANSI
  const { cleanText, ansiDecorations } = useMemo(() => {
    const parsed = parseAnsi(displayContent);
    return { cleanText: parsed.cleanText, ansiDecorations: parsed.decorations };
  }, [displayContent]);

  // ── Stato riproduzione: ref (loop senza stale closure) + state (re-render) + store (UI via rAF) ──
  const [isPlayingState, _setIsPlayingRaw] = useState(false);
  const isPlayingRef = useRef(false);
  const setIsPlaying = useCallback((val: boolean) => {
    isPlayingRef.current = val;
    playbackStore.isPlaying = val;
    _setIsPlayingRaw(val);
  }, []);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeedRef = useRef(1);

  // ── Posizione corrente: ref + state sincronizzati ──
  const [currentIndexState, _setCurrentIndexRaw] = useState(0);
  const currentIndexRef = useRef(0);
  const playbackStore = getPlaybackStore(tabId);
  const setCurrentIndex = useCallback((val: number | ((prev: number) => number)) => {
    _setCurrentIndexRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      currentIndexRef.current = next;
      return next;
    });
  }, []);

  const [frameAdvanceTick, setFrameAdvanceTick] = useState(0);

  // ── Refs stabili per loop e contenuto ──
  const typeQueueRef = useRef<string[]>([]);
  const baseContentRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const marksRef = useRef<number[]>([]);
  const totalLinesRef = useRef<number>(0);
  const framesRef = useRef<any[]>([]);

  const editorRef = useRef<any>(null);
  const decorationIdsRef = useRef<string[]>([]);

  // ── Applica decorazioni: unisce commit markers (gutter) e colori ANSI (inline) ──
  const applyAllDecorations = useCallback(() => {
    if (!editorRef.current) return;
    
    const marks = marksRef.current;
    const frames = framesRef.current;

    // 1. Decorazioni Commit Markers
    const commitDecorations = marks.map((mark, i) => {
      const f = frames[i];
      if (!f) return null;
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
    }).filter(d => d !== null) as any[];

    // 2. Unione con decorazioni ANSI
    const allDecorations = [...commitDecorations, ...ansiDecorations];

    decorationIdsRef.current = editorRef.current.deltaDecorations(
      decorationIdsRef.current,
      allDecorations
    );
  }, [ansiDecorations]);

  // ── Bulk Preload ──
  useEffect(() => {
    let isMounted = true;
    const preload = async () => {
      try {
        const loadedFrames = await PreloadLogFrames(host, filename);
        if (!isMounted) return;

        // Normalizziamo tutti i frame immediatamente per evitare doppi accapo ovunque
        const safeFrames = (loadedFrames || []).map((f: any) => ({
          ...f,
          delta: f.delta.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        }));
        
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
          
          for (let j = 0; j < deltaLines; j++) {
            marks.push(runningLines + 1);
            messages.push(f.message || '');
            timestamps.push(f.timestamp ? String(f.timestamp) : '');
          }
          runningLines += deltaLines;
        }

        totalLinesRef.current = runningLines;
        marksRef.current = marks;
        baseContentRef.current = initialFull;
        setDisplayContent(initialFull);
        totalLinesRef.current = runningLines;

        playbackStore.totalLines = runningLines;
        playbackStore.currentLine = runningLines;
        playbackStore.frameMarks = marks;
        playbackStore.frameMessages = messages;
        playbackStore.frameTimestamps = timestamps;
        playbackStore.isPlaying = false;

        EventsEmit('app:playback:init', { totalLines: runningLines, marks, messages, timestamps, tabId });

        setDisplayContent(initialFull);
        setCurrentIndex(runningLines);

        requestAnimationFrame(() => applyAllDecorations());

      } catch (err) {
        if (!isMounted) return;
        console.error('[LogViewer] Preload failed:', err);
      }
    };
    preload();
    return () => { 
      isMounted = false;
      if (editorRef.current) {
        const state = editorRef.current.saveViewState();
        editorManager.saveViewState(tabId, state);
        editorRef.current.setModel(null);
      }
    };
  }, [host, filename, setCurrentIndex, tabId]);

  // ── displayFrame ──
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
      playbackStore.currentLine = targetLine;
    } else {
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
      setFrameAdvanceTick(prev => prev + 1);
    }
  }, [setCurrentIndex]);

  // ── Event Handlers ──
  useEffect(() => {
    const handlePlay = (data: any) => {
      if (data.tabId !== tabId) return;
      if (isPlayingRef.current) return;
      let newIdx = currentIndexRef.current;
      if (newIdx >= totalLinesRef.current && typeQueueRef.current.length === 0) {
        displayFrame(0, true);
        newIdx = 0;
      }
      setIsPlaying(true);
    };

    const handlePause = (data: any) => {
      if (data.tabId !== tabId) return;
      if (!isPlayingRef.current) return;
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

  // ── Main Loop ──
  useEffect(() => {
    if (!isPlayingState) return;
    const delay = Math.max(50, 500 / playbackSpeed);
    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      if (typeQueueRef.current.length > 0) {
        const chunk = typeQueueRef.current.shift()!;
        baseContentRef.current += chunk;
        setDisplayContent(baseContentRef.current);
        const nextL = currentIndexRef.current + 1;
        playbackStore.currentLine = nextL;
        setCurrentIndex(nextL);
      } else {
        const cIdx = currentIndexRef.current;
        const nextFrameIdx = marksRef.current.findIndex(m => m > cIdx);
        if (nextFrameIdx !== -1) {
          displayFrame(marksRef.current[nextFrameIdx], false);
        } else {
          setIsPlaying(false);
        }
      }
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlayingState, currentIndexState, frameAdvanceTick, playbackSpeed, displayFrame, setCurrentIndex, setIsPlaying]);

  // ── Auto-scroll + ri-applicazione decorazioni ──
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        if (model.getValue() !== cleanText) {
          model.setValue(cleanText);
        }
        editorRef.current.revealLine(model.getLineCount());
      }
    }
    applyAllDecorations();
  }, [cleanText, applyAllDecorations]);

  return (
    <div className="flex flex-col h-full bg-rd-base relative">
      <div className="flex items-center justify-between px-4 py-2 bg-rd-base-alt border-b border-rd-border-subtle shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon name="fileText" size={16} className="text-rd-text-dim shrink-0" />
          <span className="text-[12px] text-rd-text-dim truncate font-mono">{filename}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => exportToTxt(displayContent, filename.replace('.log', ''))}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-[11px] text-rd-text-dim hover:text-rd-text-active transition-colors"
            title={t('common.exportAsTxtTitle')}
          >
            <Icon name="download" size={13} />
            {t('common.exportTxt')}
          </button>
          <button 
            onClick={() => exportToHtml(displayContent, filename.replace('.log', ''))}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-[11px] text-rd-text-dim hover:text-rd-text-active transition-colors"
            title={t('common.exportAsHtmlTitle')}
          >
            <Icon name="layout" size={13} />
            {t('common.exportHtml')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language="text"
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            const model = editorManager.getOrCreateModel(tabId, cleanText, 'text');
            editor.setModel(model);
            const savedState = editorManager.getViewState(tabId);
            if (savedState) {
              setTimeout(() => { editor.restoreViewState(savedState); }, 50);
            }
            if (framesRef.current.length > 0) applyAllDecorations();
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
    </div>
  );
};
