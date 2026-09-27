import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Automatically register Workbox Service Worker for offline POS and thermal printing
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New update available for ZCB POS.');
  },
  onOfflineReady() {
    console.log('[PWA] ZCB POS is fully cached and ready for offline operation.');
  },
});

// Google Maps Platform Quota & Auth Error Listener
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
