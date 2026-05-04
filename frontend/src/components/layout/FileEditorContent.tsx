import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { editorManager } from '../../lib/editorManager';

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

  useEffect(() => {
    // Cleanup: salva lo stato prima dello smontaggio
    return () => {
      if (editorRef.current) {
        const state = editorRef.current.saveViewState();
        editorManager.saveViewState(tabId, state);
        // Distacchiamo il modello per evitare che l'editor lo smaltisca (dispose) 
        // durante la distruzione del widget
        editorRef.current.setModel(null);
      }
    };
  }, [tabId]);

  return (
    <div className="w-full h-full bg-rd-base relative">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={(editor) => {
          editorRef.current = editor;
          
          // Recupera o crea il modello persistente
          const model = editorManager.getOrCreateModel(tabId, content, language);
          editor.setModel(model);

          // Ripristina lo stato della vista (scroll, cursor, selection)
          const savedState = editorManager.getViewState(tabId);
          if (savedState) {
            // Piccolo timeout per assicurarsi che il layout sia pronto
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
