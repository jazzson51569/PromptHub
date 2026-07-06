import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import {
  exportDatabase,
  restoreFromBackup,
} from "./services/database-backup";
import './styles/globals.css';
import { i18nReady } from './i18n';  // Initialize i18n / 初始化 i18n

if (window.electron?.e2e) {
  window.__PROMPTHUB_E2E_BACKUP__ = {
    exportDatabase,
    restoreFromBackup,
  };
}

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
});

void i18nReady
  .then(() => {
    try {
      const root = ReactDOM.createRoot(document.getElementById('root')!);
      root.render(
        <React.StrictMode>
          <ToastProvider>
            <App />
          </ToastProvider>
        </React.StrictMode>
      );
      console.log('[Renderer] React app rendered successfully');
    } catch (renderError) {
      console.error('[Renderer] Failed to render React app:', renderError);
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `<div style="padding: 20px; color: red;">Failed to render application: ${renderError.message}</div>`;
      }
    }
  })
  .catch((error) => {
    console.error("Failed to initialize i18n:", error);
    try {
      const root = ReactDOM.createRoot(document.getElementById('root')!);
      root.render(
        <React.StrictMode>
          <ToastProvider>
            <App />
          </ToastProvider>
        </React.StrictMode>
      );
    } catch (renderError) {
      console.error('[Renderer] Failed to render React app after i18n error:', renderError);
    }
  });
