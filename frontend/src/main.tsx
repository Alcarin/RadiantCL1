import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { initGlobalDnd } from './lib/dnd'
import './i18n/config'
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { loader } from '@monaco-editor/react';

// Genera un ID istanza unico per filtrare gli eventi globali di Wails tra diverse tab/finestre
(window as any).__radiant_instance_id = Math.random().toString(36).substring(2, 15);

// Setup ufficiale Vite per Monaco Editor: usa file locali completi per scavalcare Tracking Prevention di WebView2 
self.MonacoEnvironment = {
  getWorker: function (workerId, label) {
    return new editorWorker();
  }
};
loader.config({ monaco });

// Prepariamo il sistema DND prima di montare React (Singleton Bridge)




initGlobalDnd();

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <App/>
)
