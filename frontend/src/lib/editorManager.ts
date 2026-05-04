import * as monaco from 'monaco-editor';

/**
 * EditorManager (Singleton)
 * Gestisce la persistenza dei modelli e dello stato della vista di Monaco Editor.
 * Questo permette di preservare scroll, cursore e undo stack durante le operazioni
 * di Drag & Drop (smontaggio/rimontaggio dei componenti React).
 */
class EditorManager {
  private models: Map<string, monaco.editor.ITextModel> = new Map();
  private viewStates: Map<string, monaco.editor.ICodeEditorViewState> = new Map();

  /**
   * Ottiene o crea un modello per un file/sessione specifico.
   */
  getOrCreateModel(id: string, content: string, language: string = 'text'): monaco.editor.ITextModel {
    let model = this.models.get(id);
    
    // Se il modello è in cache, verifichiamo che non sia stato smaltito
    if (model && (model as any).isDisposed && (model as any).isDisposed()) {
      console.warn(`[EditorManager] Model for ${id} was disposed, removing from cache`);
      this.models.delete(id);
      model = undefined;
    }

    // Se il modello esiste già, aggiorniamo il contenuto se è cambiato
    if (model && content !== '' && model.getValue() !== content) {
      console.log(`[EditorManager] Updating existing model content for ${id}`);
      model.setValue(content);
    }

    if (!model) {
      console.log(`[EditorManager] Creating/Retrieving model for ${id}`);
      
      // Usa un URI deterministico basato sull'id per evitare duplicati in Monaco
      // Sostituiamo caratteri non validi negli URI (spazi, etc)
      const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
      const uri = monaco.Uri.parse(`radiant://editor/${safeId}`);
      
      // Se per qualche motivo un modello con lo stesso URI esiste già in Monaco
      // (es. ricaricamento a caldo o bug di sincronizzazione), recuperiamolo.
      const existingModel = monaco.editor.getModel(uri);
      if (existingModel) {
        console.log(`[EditorManager] Found existing model in Monaco registry for ${id}`);
        model = existingModel;
        // Se il contenuto è diverso, aggiorniamolo (opzionale, dipende dal caso d'uso)
        if (model.getValue() !== content && content !== '') {
           model.setValue(content);
        }
      } else {
        model = monaco.editor.createModel(content, language, uri);
      }
      
      this.models.set(id, model);
    }
    return model;
  }

  /**
   * Salva lo stato della vista (scroll, cursore, selection) per un editor specifico.
   */
  saveViewState(id: string, state: monaco.editor.ICodeEditorViewState | null) {
    if (state) {
      // console.log(`[EditorManager] Saving view state for ${id}`);
      this.viewStates.set(id, state);
    }
  }

  /**
   * Recupera lo stato della vista salvato per un editor specifico.
   */
  getViewState(id: string): monaco.editor.ICodeEditorViewState | null {
    return this.viewStates.get(id) || null;
  }

  /**
   * Rimuove un'istanza (modello e stato) quando la tab viene chiusa definitivamente.
   */
  removeInstance(id: string) {
    const model = this.models.get(id);
    if (model) {
      console.log(`[EditorManager] Disposing model for ${id}`);
      model.dispose();
      this.models.delete(id);
    }
    this.viewStates.delete(id);
  }
}

export const editorManager = new EditorManager();
