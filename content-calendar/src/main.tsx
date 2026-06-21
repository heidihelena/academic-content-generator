import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ApiClient } from './lib/api';
import { ApiIdeaGenerator } from './ai/apiIdeaGenerator';
import { setIdeaGenerator } from './ai/ideaService';

// In API mode, route AI idea generation through the backend too (the store
// already selects the API data source via VITE_API_URL — see dataSource.ts).
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setIdeaGenerator(new ApiIdeaGenerator(new ApiClient(apiUrl)));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
