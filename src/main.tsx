// Source: Google Maps Platform Code Assist
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { migrarChavesGarfoParaVimo } from './lib/migrarGarfo';

migrarChavesGarfoParaVimo();

// Intercepta e trata eventos específicos do Google Maps Platform
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-auth-failure'));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return;
  }
  origConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);

