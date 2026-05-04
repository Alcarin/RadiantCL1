/**
 * playbackStore — Stato condiviso del log player, interamente lato JavaScript.
 *
 * Pattern "media player": l'engine (LogViewerContent) scrive su questo oggetto
 * in modo sincrono, la UI (HistoryView) lo legge via requestAnimationFrame.
 *
 * Zero round-trip Go, zero latenza, zero rischio di eventi fuori ordine.
 * Equivalente esatto di: HTMLVideoElement.currentTime / HTMLVideoElement.paused
 */
export interface PlaybackState {
  currentLine: number;
  totalLines: number;
  isPlaying: boolean;
  frameMarks: number[];
  frameMessages: string[];
  frameTimestamps: string[];
}

const stores = new Map<string, PlaybackState>();

export const getPlaybackStore = (tabId: string): PlaybackState => {
  let store = stores.get(tabId);
  if (!store) {
    store = {
      currentLine: 0,
      totalLines: 0,
      isPlaying: false,
      frameMarks: [],
      frameMessages: [],
      frameTimestamps: [],
    };
    stores.set(tabId, store);
  }
  return store;
};

/**
 * Manteniamo un'istanza "legacy" per compatibilità durante la migrazione,
 * ma punterà sempre all'ultima sessione inizializzata se non specificato.
 */
export const playbackStore = getPlaybackStore('default');
