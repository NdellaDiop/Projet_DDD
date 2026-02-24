import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx'; // Importez AuthProvider
import { BrowserRouter } from 'react-router-dom'; // Si vous utilisez React Router, DOIT ÊTRE PRÉSENT

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* C'est ici que BrowserRouter doit envelopper AuthProvider */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);