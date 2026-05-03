/**
 * Utility per l'esportazione dei log di RadiantCL1.
 * Gestisce la conversione da Raw ANSI a vari formati (TXT, HTML).
 */

// Regex per rimuovere i codici ANSI (colori, movimenti cursore, ecc.)
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|](([0-9]+(;[^\x07\x1b]*))?(\x07|\x1b\\))/g;

/**
 * Rimuove tutti i codici ANSI da una stringa.
 */
export const stripAnsi = (text: string): string => {
  return text.replace(ansiRegex, '');
};

/**
 * Converte una stringa Raw ANSI in HTML con i colori corretti.
 * Nota: Questa è una versione semplificata che gestisce i colori SGR più comuni.
 */
export const ansiToHtml = (text: string): string => {
  const lines = text.split('\n');
  let result = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<style>\n';
  result += 'body { background-color: #1e1e1e; color: #cccccc; font-family: "JetBrains Mono", monospace; padding: 20px; line-height: 1.5; white-space: pre-wrap; }\n';
  result += '.ansi-bold { font-weight: bold; }\n';
  result += '.ansi-black { color: #000000; }\n';
  result += '.ansi-red { color: #cd3131; }\n';
  result += '.ansi-green { color: #0dbc79; }\n';
  result += '.ansi-yellow { color: #e5e510; }\n';
  result += '.ansi-blue { color: #2472c8; }\n';
  result += '.ansi-magenta { color: #bc3fbc; }\n';
  result += '.ansi-cyan { color: #11a8cd; }\n';
  result += '.ansi-white { color: #e5e5e5; }\n';
  result += '.ansi-bright-black { color: #666666; }\n';
  result += '.ansi-bright-red { color: #f14c4c; }\n';
  result += '.ansi-bright-green { color: #23d18b; }\n';
  result += '.ansi-bright-yellow { color: #f5f543; }\n';
  result += '.ansi-bright-blue { color: #3b8eea; }\n';
  result += '.ansi-bright-magenta { color: #d670d6; }\n';
  result += '.ansi-bright-cyan { color: #29b8db; }\n';
  result += '.ansi-bright-white { color: #e5e5e5; }\n';
  result += '</style>\n</head>\n<body>\n';

  // Sostituiamo caratteri HTML speciali
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Funzione semplice per convertire i codici colore ANSI in classi CSS
  // Per una gestione perfetta servirebbe un parser di stato (tipo ansi_up), 
  // ma per un export di base questo copre il 90% dei casi.
  let currentHtml = escapeHtml(text);
  
  // Mappatura semplificata dei codici SGR comuni
  const colorMap: Record<string, string> = {
    '1': 'ansi-bold',
    '30': 'ansi-black',
    '31': 'ansi-red',
    '32': 'ansi-green',
    '33': 'ansi-yellow',
    '34': 'ansi-blue',
    '35': 'ansi-magenta',
    '36': 'ansi-cyan',
    '37': 'ansi-white',
    '90': 'ansi-bright-black',
    '91': 'ansi-bright-red',
    '92': 'ansi-bright-green',
    '93': 'ansi-bright-yellow',
    '94': 'ansi-bright-blue',
    '95': 'ansi-bright-magenta',
    '96': 'ansi-bright-cyan',
    '97': 'ansi-bright-white',
  };

  // Trasformiamo i codici ESC[...m in span
  // Nota: Questo parser è molto grezzo e non gestisce il reset '0' correttamente se nidificato,
  // ma per log lineari funziona bene.
  currentHtml = currentHtml.replace(/\u001b\[([0-9;]+)m/g, (match, codeStr) => {
    if (codeStr === '0') return '</span>';
    const codes = codeStr.split(';');
    let classes = '';
    for (const code of codes) {
      if (colorMap[code]) {
        classes += colorMap[code] + ' ';
      }
    }
    return classes ? `<span class="${classes.trim()}">` : '';
  });

  result += currentHtml;
  result += '\n</body>\n</html>';
  return result;
};

/**
 * Triggera il download di un file nel browser.
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Esporta il log in formato testo puro (senza ANSI).
 */
export const exportToTxt = (text: string, filename: string) => {
  const clean = stripAnsi(text);
  downloadFile(clean, filename.endsWith('.txt') ? filename : `${filename}.txt`, 'text/plain');
};

/**
 * Esporta il log in formato HTML (con colori).
 */
export const exportToHtml = (text: string, filename: string) => {
  const html = ansiToHtml(text);
  downloadFile(html, filename.endsWith('.html') ? filename : `${filename}.html`, 'text/html');
};
