import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { adBlocker } from './services/adBlocker.ts';

// Immediately boot internal popup blocker & ad filter
adBlocker.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
