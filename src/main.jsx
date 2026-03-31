// ============================================================
//  main.jsx  –  App entry point
//  Mounts React app + global Toast notification container
// ============================================================

import { StrictMode }    from 'react';
import { createRoot }    from 'react-dom/client';
import App               from './App.jsx';
import { ToastContainer } from './component/Toast.jsx';
import './index.css';
import './App.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Global toast notifications — mounted outside App so they
        overlay any modal or sidebar */}
    <ToastContainer />
  </StrictMode>,
);
