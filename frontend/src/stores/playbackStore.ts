/**
 * playbackStore — Stato condiviso del log player, interamente lato JavaScript.
 *
 * Pattern "media player": l'engine (LogViewerContent) scrive su questo oggetto
 * in modo sincrono, la UI (HistoryView) lo legge via requestAnimationFrame.
 *
 * Zero round-trip Go, zero latenza, zero rischio di eventi fuori ordine.
 * Equivalente esatto di: HTMLVideoElement.currentTime / HTMLVideoElement.paused
 */
export const playbackStore = {
  /** Linea corrente (aggiornata ad ogni tick del typewriter) */
  currentLine: 0,
  /** Totale linee del log corrente (impostato all'init dal preloading) */
  totalLines: 0,
  /** Stato di riproduzione */
  isPlaying: false,
  /** Posizioni dei commit nel log (in numero di linee) */
  frameMarks: [] as number[],
  /** Messaggi dei commit corrispondenti */
  frameMessages: [] as string[],
  /** Timestamp ISO dei commit (es. '2026-04-18T18:30:24+02:00') */
  frameTimestamps: [] as string[],
};
