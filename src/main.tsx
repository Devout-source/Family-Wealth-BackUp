import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Filter debug and info messages from development bundlers
const originalDebug = console.debug;
console.debug = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0]?.message || args[0] || '');
  if (
    msg.includes('[vite]') ||
    msg.includes('[hmr]') ||
    msg.includes('WebSocket') ||
    msg.includes('connecting...')
  ) {
    return;
  }
  originalDebug(...args);
};

// Cleanly filter library-internal deprecations (e.g. Recharts internal defaultProps on React 19)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Support for defaultProps will be removed') ||
    msg.includes('width(-1) and height(-1) of chart') ||
    msg.includes('The width(-1) and height(-1)')
  ) {
    return;
  }
  originalWarn(...args);
};

// Filter out benign environment WebSocket / HMR closures
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0]?.message || args[0] || '');
  if (
    msg.includes('[vite]') ||
    msg.includes('failed to connect to websocket') ||
    msg.includes('WebSocket closed without opened')
  ) {
    return;
  }
  originalError(...args);
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
