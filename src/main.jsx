import React from 'react';
import { createRoot } from 'react-dom/client';
import { initialLang, setLang } from './i18n.js';
import App from './App';
import './styles.css';

setLang(initialLang()).finally(() => {
  createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
});
