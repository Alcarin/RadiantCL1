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
  // Foreground
  result += '.ansi-black { color: #2e3436; }\n';
  result += '.ansi-red { color: #cc0000; }\n';
  result += '.ansi-green { color: #4e9a06; }\n';
  result += '.ansi-yellow { color: #c4a000; }\n';
  result += '.ansi-blue { color: #3465a4; }\n';
  result += '.ansi-magenta { color: #75507b; }\n';
  result += '.ansi-cyan { color: #06989a; }\n';
  result += '.ansi-white { color: #d3d7cf; }\n';
  result += '.ansi-bright-black { color: #555753; }\n';
  result += '.ansi-bright-red { color: #ef2929; }\n';
  result += '.ansi-bright-green { color: #8ae234; }\n';
  result += '.ansi-bright-yellow { color: #fce94f; }\n';
  result += '.ansi-bright-blue { color: #729fcf; }\n';
  result += '.ansi-bright-magenta { color: #ad7fa8; }\n';
  result += '.ansi-bright-cyan { color: #34e2e2; }\n';
  result += '.ansi-bright-white { color: #eeeeec; }\n';
  // Background
  result += '.ansi-bg-black { background-color: #2e3436; }\n';
  result += '.ansi-bg-red { background-color: #cc0000; }\n';
  result += '.ansi-bg-green { background-color: #4e9a06; }\n';
  result += '.ansi-bg-yellow { background-color: #c4a000; }\n';
  result += '.ansi-bg-blue { background-color: #3465a4; }\n';
  result += '.ansi-bg-magenta { background-color: #75507b; }\n';
  result += '.ansi-bg-cyan { background-color: #06989a; }\n';
  result += '.ansi-bg-white { background-color: #d3d7cf; }\n';
  result += '.ansi-bg-bright-black { background-color: #555753; }\n';
  result += '.ansi-bg-bright-red { background-color: #ef2929; }\n';
  result += '.ansi-bg-bright-green { background-color: #8ae234; }\n';
  result += '.ansi-bg-bright-yellow { background-color: #fce94f; }\n';
  result += '.ansi-bg-bright-blue { background-color: #729fcf; }\n';
  result += '.ansi-bg-bright-magenta { background-color: #ad7fa8; }\n';
  result += '.ansi-bg-bright-cyan { background-color: #34e2e2; }\n';
  result += '.ansi-bg-bright-white { background-color: #eeeeec; }\n';
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

  let currentHtml = escapeHtml(text);
  
  // Mappatura completa dei codici SGR
  const colorMap: Record<string, string> = {
    '1': 'ansi-bold',
    '30': 'ansi-black', '31': 'ansi-red', '32': 'ansi-green', '33': 'ansi-yellow',
    '34': 'ansi-blue', '35': 'ansi-magenta', '36': 'ansi-cyan', '37': 'ansi-white',
    '90': 'ansi-bright-black', '91': 'ansi-bright-red', '92': 'ansi-bright-green', '93': 'ansi-bright-yellow',
    '94': 'ansi-bright-blue', '95': 'ansi-bright-magenta', '96': 'ansi-bright-cyan', '97': 'ansi-bright-white',
    '40': 'ansi-bg-black', '41': 'ansi-bg-red', '42': 'ansi-bg-green', '43': 'ansi-bg-yellow',
    '44': 'ansi-bg-blue', '45': 'ansi-bg-magenta', '46': 'ansi-bg-cyan', '47': 'ansi-bg-white',
    '100': 'ansi-bg-bright-black', '101': 'ansi-bg-bright-red', '102': 'ansi-bg-bright-green', '103': 'ansi-bg-bright-yellow',
    '104': 'ansi-bg-bright-blue', '105': 'ansi-bg-bright-magenta', '106': 'ansi-bg-bright-cyan', '107': 'ansi-bg-bright-white'
  };

  // Trasformiamo i codici ESC[...m in span
  currentHtml = currentHtml.replace(/\u001b\[([0-9;]+)m/g, (match, codeStr) => {
    if (codeStr === '0') return '</span>';
    const codes = codeStr.split(';');
    let classes = '';
    for (const code of codes) {
      if (colorMap[code]) {
        classes += colorMap[code] + ' ';
      }
    }
    // Ogni volta che apriamo uno span per un colore, dovremmo idealmente chiudere quello precedente se 
    // non è un reset, ma per semplicità qui facciamo uno stack lineare.
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
