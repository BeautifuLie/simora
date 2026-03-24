import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '../style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
