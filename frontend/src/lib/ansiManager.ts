import * as monaco from 'monaco-editor';

/**
 * Utility per gestire i codici ANSI in Monaco Editor.
 */

const ansiRegex = /[\u001b\u009b](?:\[[0-9;?]*[a-zA-Z]|\][0-9;]*.*?(?:\x07|\x1b\\)|[\(\)#][A-Z0-9]|[a-zA-Z0-9>=<c])/g;

interface AnsiState {
  foreground?: string;
  bold?: boolean;
}

export interface ParsedAnsi {
  cleanText: string;
  decorations: monaco.editor.IModelDeltaDecoration[];
}

const colorMap: Record<string, string> = {
  '31': 'ansi-red', '32': 'ansi-green', '33': 'ansi-yellow',
  '34': 'ansi-blue', '35': 'ansi-magenta', '36': 'ansi-cyan', '37': 'ansi-white',
  '91': 'ansi-bright-red', '92': 'ansi-bright-green', '93': 'ansi-bright-yellow',
  '94': 'ansi-bright-blue', '95': 'ansi-bright-magenta', '96': 'ansi-bright-cyan'
};

/**
 * Parsa ANSI e calcola le decorazioni SUL TESTO PULITO.
 */
export function parseAnsi(text: string): ParsedAnsi {
  if (!text) return { cleanText: '', decorations: [] };

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  
  let cleanText = '';
  let currentState: AnsiState = {};
  let lastPos = 0;
  
  // Per tracciare la posizione nel TESTO PULITO
  let currentLine = 1;
  let currentCol = 1;

  let match;
  ansiRegex.lastIndex = 0;

  while ((match = ansiRegex.exec(normalized)) !== null) {
    // 1. Prendi il testo "normale" prima del match e aggiungilo al testo pulito
    const plainPart = normalized.substring(lastPos, match.index);
    if (plainPart.length > 0) {
      const startLine = currentLine;
      const startCol = currentCol;
      
      // Aggiorna le coordinate del testo pulito e costruisci la stringa finale
      for (const char of plainPart) {
        cleanText += char;
        if (char === '\n') {
          currentLine++;
          currentCol = 1;
        } else {
          currentCol++;
        }
      }

      // Se abbiamo uno stato attivo (colore/bold), crea la decorazione per questa parte
      const classes = [];
      if (currentState.foreground) classes.push(currentState.foreground);
      if (currentState.bold) classes.push('ansi-bold');

      if (classes.length > 0) {
        decorations.push({
          range: new monaco.Range(startLine, startCol, currentLine, currentCol),
          options: { 
            inlineClassName: classes.join(' '),
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }
    }

    // 2. Elabora il codice ANSI per aggiornare lo stato (ma NON aggiungerlo al testo pulito)
    const codeStr = match[0];
    if (codeStr.includes('[') && codeStr.endsWith('m')) {
      const params = codeStr.split(/[;\[m]/);
      for (const p of params) {
        const cleanP = p.replace(/[^0-9]/g, '');
        if (cleanP === '') continue;
        const codeNum = parseInt(cleanP, 10);
        const code = codeNum.toString();
        if (code === '0') currentState = {};
        else if (code === '1') currentState.bold = true;
        else if (colorMap[code]) currentState.foreground = colorMap[code];
      }
    }
    
    lastPos = ansiRegex.lastIndex;
  }

  // Aggiungi l'ultima parte di testo se presente
  const remaining = normalized.substring(lastPos);
  if (remaining.length > 0) {
    const startLine = currentLine;
    const startCol = currentCol;
    for (const char of remaining) {
      cleanText += char;
      if (char === '\n') { currentLine++; currentCol = 1; }
      else { currentCol++; }
    }
    const classes = [];
    if (currentState.foreground) classes.push(currentState.foreground);
    if (currentState.bold) classes.push('ansi-bold');
    if (classes.length > 0) {
      decorations.push({
        range: new monaco.Range(startLine, startCol, currentLine, currentCol),
        options: { 
          inlineClassName: classes.join(' '),
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      });
    }
  }

  // Pulizia finale per sicurezza da eventuali caratteri di controllo orfani non catturati dal regex
  // Nota: questo potrebbe sballare leggermente le decorazioni se toglie caratteri, 
  // ma i caratteri di controllo (0-31) non dovrebbero essere presenti nel testo "plain".
  cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  return { cleanText, decorations };
}

export function stripAnsi(text: string): string {
  return text.replace(ansiRegex, '')
             .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}
