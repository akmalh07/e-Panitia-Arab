
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { db } from './services/dbService';
import './index.css';

// Initialize DB with basic data if empty
const startApp = async () => {
  await db.init();
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

startApp();
