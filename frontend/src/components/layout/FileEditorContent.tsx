import React, { useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { editorManager } from '../../lib/editorManager';
import { parseAnsi } from '../../lib/ansiManager';

interface FileEditorContentProps {
  tabId: string;
  content: string;
  language?: string;
}

export const FileEditorContent: React.FC<FileEditorContentProps> = ({
  tabId,
  content,
  language = 'text'
}) => {
  const editorRef = useRef<any>(null);
  const decorationIdsRef = useRef<string[]>([]);

  // Parsiamo il contenuto per estrarre testo pulito e decorazioni ANSI
  const { cleanText, decorations } = useMemo(() => parseAnsi(content), [content]);

  useEffect(() => {
    // Cleanup: salva lo stato prima dello smontaggio
    return () => {
      if (editorRef.current) {
        const state = editorRef.current.saveViewState();
        editorManager.saveViewState(tabId, state);
        // Distacchiamo il modello per sicurezza
        editorRef.current.setModel(null);
      }
    };
  }, [tabId]);

  // Applica le decorazioni ANSI quando l'editor è montato o il contenuto cambia
  useEffect(() => {
    if (editorRef.current && decorations.length > 0) {
      decorationIdsRef.current = editorRef.current.deltaDecorations(
        decorationIdsRef.current,
        decorations
      );
    }
  }, [decorations]);

  return (
    <div className="w-full h-full bg-rd-base relative">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={(editor) => {
          editorRef.current = editor;
          
          // Recupera o crea il modello persistente (usando il testo pulito)
          const model = editorManager.getOrCreateModel(tabId, cleanText, language);
          editor.setModel(model);

          // Applica decorazioni iniziali
          if (decorations.length > 0) {
            decorationIdsRef.current = editor.deltaDecorations([], decorations);
          }

          // Ripristina lo stato della vista (scroll, cursor, selection)
          const savedState = editorManager.getViewState(tabId);
          if (savedState) {
            setTimeout(() => {
              editor.restoreViewState(savedState);
              editor.focus();
            }, 50);
          }
        }}
        options={{
          readOnly: true,
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
          wordWrap: 'on',
          padding: { top: 8 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderLineHighlight: 'line',
          lineHeight: 20,
          letterSpacing: 0.3,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
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
