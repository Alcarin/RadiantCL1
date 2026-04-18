import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      fastRefresh: process.env.NODE_ENV !== 'test'
    }),
    // @ts-ignore - Gestione compatibilità CJS/ESM
    (monacoEditorPlugin.default || monacoEditorPlugin)({
      // Lingue supportate dai worker separati
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html']
    })
  ]
})
