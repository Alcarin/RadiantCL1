import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { initGlobalDnd } from './lib/dnd'

// Prepariamo il sistema DND prima di montare React (Singleton Bridge)
initGlobalDnd();

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)
