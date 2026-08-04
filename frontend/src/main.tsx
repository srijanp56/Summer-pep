import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply saved theme immediately to prevent flash of wrong theme
const savedTheme = localStorage.getItem('droneroute-theme') ?? 'dark';
document.documentElement.classList.add(savedTheme);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
