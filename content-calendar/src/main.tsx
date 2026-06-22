import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ApiClient } from './lib/api';
import { ApiIdeaGenerator } from './ai/apiIdeaGenerator';
import { setIdeaGenerator } from './ai/ideaService';
import { ApiThreadDrafter } from './ai/apiThreadDrafter';
import { setThreadDrafter } from './ai/threadService';
import { ApiShortsPlanner } from './ai/apiShortsPlanner';
import { setShortsPlanner } from './ai/shortsService';

// In API mode, route AI generation through the backend (the store already
// selects the API data source via VITE_API_URL — see dataSource.ts). The
// abstract→thread and video→shorts drafters use the backend LLM when a key is
// configured, and fall back to the local heuristic otherwise.
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  const client = new ApiClient(apiUrl);
  setIdeaGenerator(new ApiIdeaGenerator(client));
  setThreadDrafter(new ApiThreadDrafter(client));
  setShortsPlanner(new ApiShortsPlanner(client));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
