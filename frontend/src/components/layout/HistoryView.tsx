import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GetSessionLogs, GetLogContent } from '../../../wailsjs/go/main/App';
import { TreeView, TreeNode } from '../ui/TreeView';
import { SideBarSection } from './SideBarSection';
import { useTranslation } from 'react-i18next';
import { EventsEmit, EventsOn } from '../../../wailsjs/runtime/runtime';
import { Icon } from '../ui/Icon';
import { playbackStore } from '../../stores/playbackStore';

export const HistoryView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [hostLogs, setHostLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<{ host: string; filename: string; id: string } | null>(null);

  // isPlaying: state per il bottone (React re-render), ref per aggiornamenti ottimistici
  const [isPlayingState, setIsPlayingState] = useState(false);
  const isPlayingRef = useRef(false);

  // Stati a BASSA frequenza: cambiano solo a ogni nuovo log → un solo re-render
  const [sliderMax, setSliderMax] = useState(0);
  const [frameMarks, setFrameMarks] = useState<number[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState('');

  // Refs per aggiornamenti DOM ad alta frequenza (bypassano React)
  const sliderRef = useRef<HTMLInputElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const isSeekingRef = useRef(false);
  const lastMsgFrameRef = useRef(-1); // dedup aggiornamento currentMessage

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const logs = await GetSessionLogs();
      setHostLogs(logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── rAF loop: legge playbackStore direttamente nello stesso processo JS ──
  // Pattern identico a: seekBar.value = video.currentTime (media player standard)
  // Zero WebSocket, zero Go, zero latenza, zero possibilità di eventi fuori ordine.
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const { currentLine, totalLines, isPlaying, frameMarks: marks, frameMessages: messages } = playbackStore;

      // ── Posizione: aggiornamento DOM diretto, skippato durante il drag ──
      if (!isSeekingRef.current) {
        if (sliderRef.current) sliderRef.current.value = String(currentLine);
        if (counterRef.current) counterRef.current.textContent = `${currentLine} / ${totalLines}`;

        // Messaggio e timestamp frame: aggiorna React state solo al cambio frame
        let fIdx = marks.findIndex(m => m > currentLine);
        if (fIdx === -1 && marks.length > 0) fIdx = marks.length - 1;
        if (fIdx !== lastMsgFrameRef.current) {
          lastMsgFrameRef.current = fIdx;
          const msg = fIdx >= 0 && fIdx < messages.length ? messages[fIdx] : '';
          const ts  = fIdx >= 0 && fIdx < playbackStore.frameTimestamps.length
            ? playbackStore.frameTimestamps[fIdx] : '';
          setCurrentMessage(msg);
          // Formatta il timestamp ISO in data/ora locale leggibile
          setCurrentTimestamp(ts ? new Date(ts).toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          }) : '');
        }
      }

      // ── isPlaying: aggiorna React state solo al cambio (bassa frequenza) ──
      if (isPlaying !== isPlayingRef.current) {
        isPlayingRef.current = isPlaying;
        setIsPlayingState(isPlaying);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []); // [] — legge sempre dal modulo, mai stale, runs forever

  useEffect(() => {
    fetchLogs();

    const offTabChange = EventsOn('app:tab-changed', (tab: any) => {
      if (tab && tab.type === 'log-viewer') {
        setActiveLog({ host: tab.logHost, filename: tab.logFilename, id: tab.id });
      } else {
        setActiveLog(null);
        isPlayingRef.current = false;
        setIsPlayingState(false);
        setSliderMax(0);
        setFrameMarks([]);
        setCurrentMessage('');
        lastMsgFrameRef.current = -1;
        if (sliderRef.current) sliderRef.current.value = '0';
        if (counterRef.current) counterRef.current.textContent = '0 / 0';
      }
    });

    // app:playback:init: unico evento Wails rimasto (bassa frequenza, una volta per log).
    // Necessario per aggiornare gli stati React di HistoryView (sliderMax, frameMarks per tick marks).
    // Il playbackStore è già stato popolato dall'engine in modo sincrono prima di questo evento.
    const offPlaybackInit = EventsOn('app:playback:init', (initData: any) => {
      const total = initData.totalLines as number;
      const marks = (initData.marks || []) as number[];
      const messages = (initData.messages || []) as string[];
      const timestamps = (initData.timestamps || []) as string[];

      // Aggiorna stati React per il rendering (tick marks, max slider)
      setSliderMax(total);
      setFrameMarks(marks);
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : '';
      const lastTs  = timestamps.length > 0 ? timestamps[timestamps.length - 1] : '';
      setCurrentMessage(lastMsg);
      setCurrentTimestamp(lastTs ? new Date(lastTs).toLocaleString() : '');
      lastMsgFrameRef.current = -1;

      // Aggiornamento DOM diretto per feedback immediato
      if (sliderRef.current) sliderRef.current.value = String(total);
      if (counterRef.current) counterRef.current.textContent = `${total} / ${total}`;
    });

    return () => {
      offTabChange();
      offPlaybackInit();
    };
  }, []);

  const treeNodes = useMemo<TreeNode[]>(() => {
    // undefined = sistema operativo locale della macchina (non la lingua dell'app)
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit'
    });
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    return hostLogs.map((hl) => {
      const sessionsByDate: Record<string, any[]> = {};
      hl.sessions.forEach((s: any) => {
        const dateStr = dateFormatter.format(new Date(s.timestamp));
        if (!sessionsByDate[dateStr]) sessionsByDate[dateStr] = [];
        sessionsByDate[dateStr].push(s);
      });

      const sortedDates = Object.keys(sessionsByDate).sort((a, b) =>
        new Date(sessionsByDate[b][0].timestamp).getTime() - new Date(sessionsByDate[a][0].timestamp).getTime()
      );

      return {
        id: `host-${hl.hostName}`,
        label: hl.hostName,
        icon: 'server',
        children: sortedDates.map((date) => ({
          id: `date-${hl.hostName}-${date}`,
          label: date,
          icon: 'folder',
          children: sessionsByDate[date]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((s) => ({
              id: `log-${hl.hostName}-${s.filename}`,
              label: timeFormatter.format(new Date(s.timestamp)),
              icon: 'clock',
              data: { host: hl.hostName, filename: s.filename, timestamp: s.timestamp }
            }))
        }))
      };
    });
  }, [hostLogs]);

  const handleSelect = async (node: TreeNode) => {
    if (node.id.startsWith('log-') && node.data) {
      try {
        const content = await GetLogContent(node.data.host, node.data.filename);
        const logId = `log-${node.data.host}-${node.data.filename}`;
        setActiveLog({ host: node.data.host, filename: node.data.filename, id: logId });

        // Reset stato riproduzione per il nuovo log
        isPlayingRef.current = false;
        setIsPlayingState(false);
        lastMsgFrameRef.current = -1;

        EventsEmit('app:open-log', {
          host: node.data.host,
          filename: node.data.filename,
          content: content,
          timestamp: node.data.timestamp
        });
      } catch (err) {
        console.error('Failed to load log content:', err);
      }
    }
  };

  const handlePlaybackAction = (action: string, value?: any) => {
    if (!activeLog) return;
    EventsEmit(`app:playback:${action}`, { tabId: activeLog.id, value });
  };

  // ── Play/Pause: aggiornamento ottimistico → bottone risponde al primo click ──
  const handlePlayPause = () => {
    if (!activeLog) return;
    const nextPlaying = !isPlayingRef.current;
    isPlayingRef.current = nextPlaying;     // sincrono → bottone cambia subito
    setIsPlayingState(nextPlaying);          // re-render immediato
    EventsEmit(`app:playback:${nextPlaying ? 'play' : 'pause'}`, { tabId: activeLog.id });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Playback Controls ── */}
      <SideBarSection title={t('common.playback') || 'Riproduzione'}>
        <div className="px-3 py-2 space-y-3">
          {activeLog ? (
            <>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => handlePlaybackAction('stop')}
                  className="p-1.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
                  title={t('common.stop')}
                >
                  <Icon name="stop" size={16} />
                </button>
                <button
                  onClick={() => handlePlaybackAction('prev')}
                  className="p-1.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
                  title={t('common.prevFrame')}
                >
                  <Icon name="skipBack" size={16} />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-2 bg-rd-accent/10 hover:bg-rd-accent/20 rounded-full text-rd-accent transition-colors"
                  title={isPlayingState ? t('common.pause') : t('common.play')}
                >
                  <Icon name={isPlayingState ? 'pause' : 'play'} size={20} fill="currentColor" />
                </button>
                <button
                  onClick={() => handlePlaybackAction('next')}
                  className="p-1.5 hover:bg-white/10 rounded text-rd-text-dim hover:text-rd-text-active"
                  title={t('common.nextFrame')}
                >
                  <Icon name="skipForward" size={16} />
                </button>

                <div className="flex items-center gap-1 ml-1 rounded px-1.5 py-0.5">
                  <select
                    defaultValue={1}
                    onChange={(e) => handlePlaybackAction('speed', Number(e.target.value))}
                    className="text-[10px] font-bold text-rd-accent outline-none cursor-pointer"
                    style={{ background: '#252526', color: '#c9a84c' }}
                  >
                    <option value={0.5} style={{ background: '#252526', color: '#cccccc' }}>0.5x</option>
                    <option value={1}   style={{ background: '#252526', color: '#cccccc' }}>1x</option>
                    <option value={2}   style={{ background: '#252526', color: '#cccccc' }}>2x</option>
                    <option value={5}   style={{ background: '#252526', color: '#cccccc' }}>5x</option>
                    <option value={10}  style={{ background: '#252526', color: '#cccccc' }}>10x</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-[10px] text-rd-text-dim px-1 uppercase tracking-wider font-semibold">
                  <span>Timeline</span>
                  {/* Fallback JSX: mostra l'ultimo valore noto su re-render React.
                      Tra un re-render e l'altro, il counterRef è aggiornato via DOM dal rAF loop. */}
                  <span ref={counterRef}>{playbackStore.currentLine} / {sliderMax}</span>
                </div>

                <div className="relative w-full h-3 flex items-center">
                  {/* Layer geometrico: segni dei commit sul log */}
                  <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden bg-rd-input opacity-70">
                    {frameMarks.map((mark, i) => {
                      const pos = sliderMax > 0 ? (mark / sliderMax) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-rd-accent/60"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Slider UNCONTROLLED: React non tocca mai il value durante il playback.
                      Il rAF loop lo aggiorna via sliderRef.current.value — stesso processo JS,
                      stessa velocità di video.currentTime in un media player. */}
                  <input
                    ref={sliderRef}
                    type="range"
                    min={0}
                    max={sliderMax}
                    defaultValue={sliderMax}
                    onMouseDown={() => { isSeekingRef.current = true; }}
                    onChange={(e) => {
                      // Scrubbing continuo durante il drag: aggiorna contenuto e counter.
                      // Il rAF loop è bloccato da isSeekingRef, quindi lo slider non flickera.
                      const idx = parseInt(e.currentTarget.value);
                      if (counterRef.current) {
                        counterRef.current.textContent = `${idx} / ${playbackStore.totalLines}`;
                      }
                      handlePlaybackAction('seek', idx);
                    }}
                    onMouseUp={(e) => {
                      isSeekingRef.current = false;
                      // Seek finale per assicurarsi di atterrare sul valore corretto
                      const idx = parseInt(e.currentTarget.value);
                      if (counterRef.current) {
                        counterRef.current.textContent = `${idx} / ${playbackStore.totalLines}`;
                      }
                      handlePlaybackAction('seek', idx);
                    }}
                    className="absolute w-full h-full bg-transparent appearance-none cursor-pointer accent-rd-accent"
                  />
                </div>
              </div>

              {/* Info commit sotto lo slider: data/ora + direzione del commit.
                  Il formato del messaggio jj è "sessionId | timestamp | direction".
                  Mostriamo solo la direzione (ultima parte), il timestamp è già in gold. */}
              {(() => {
                const parts = currentMessage ? currentMessage.split(' | ') : [];
                const direction = parts.length >= 3 ? parts.slice(2).join(' | ') : currentMessage;
                const fullTooltip = currentTimestamp && direction
                  ? `${currentTimestamp}  —  ${direction}`
                  : currentTimestamp || direction;
                return (
                  <div
                    className="text-[10px] text-rd-text-dim truncate px-1 mt-1 cursor-default"
                    title={fullTooltip}
                  >
                    {currentTimestamp && (
                      <span className="text-rd-accent font-semibold mr-1">{currentTimestamp}</span>
                    )}
                    <span className="italic">{direction || t('common.ready')}</span>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-xs text-rd-text-dim italic p-2 text-center">
              {t('common.selectLogToPlay') || 'Seleziona un log per riprodurre'}
            </div>
          )}
        </div>
      </SideBarSection>

      {/* ── History Tree ── */}
      <SideBarSection
        title={t('common.history')}
        className="flex-1 min-h-0"
        actions={
          <button
            onClick={fetchLogs}
            className="p-1 hover:bg-white/10 rounded transition-colors text-rd-text-dim flex items-center justify-center translate-y-[2px]"
            title={t('common.reload')}
          >
            <Icon name="refresh" size={14} />
          </button>
        }
      >
        <div className="flex-1 min-h-0 container-tree-fix">
          {loading ? (
            <div className="p-4 text-xs text-rd-text-dim italic">{t('common.loading')}</div>
          ) : treeNodes.length > 0 ? (
            <TreeView
              nodes={treeNodes}
              onSelect={handleSelect}
              selectedId={activeLog?.id}
            />
          ) : (
            <div className="p-4 text-xs text-rd-text-dim italic">{t('common.noLogsFound')}</div>
          )}
        </div>
      </SideBarSection>
    </div>
  );
};
