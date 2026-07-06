import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import {
  exportDatabase,
  restoreFromBackup,
} from "./services/database-backup";
import './styles/globals.css';
import { i18nReady } from './i18n';

const logError = (message: string, error?: Error) => {
  console.error('[Renderer Startup Error]', message, error);
  const errorInfo = {
    message,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  };
  try {
    window.electron?.settings?.writeLog('renderer_startup_error', JSON.stringify(errorInfo));
  } catch {
    console.error('Failed to write log:', errorInfo);
  }
};

window.onerror = (message, source, lineno, colno, error) => {
  logError(`Global error: ${message} at ${source}:${lineno}:${colno}`, error);
  return true;
};

window.addEventListener('unhandledrejection', (event) => {
  logError(`Unhandled rejection: ${event.reason}`, event.reason instanceof Error ? event.reason : undefined);
  event.preventDefault();
});

if (window.electron?.e2e) {
  window.__PROMPTHUB_E2E_BACKUP__ = {
    exportDatabase,
    restoreFromBackup,
  };
}

void i18nReady.then(() => {
  try {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <ToastProvider>
          <App />
        </ToastProvider>
      </React.StrictMode>
    );
  } catch (error) {
    logError('React rendering failed', error instanceof Error ? error : new Error(String(error)));
    document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Application Error</h1>
      <p>Failed to initialize application.</p>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>`;
  }
});