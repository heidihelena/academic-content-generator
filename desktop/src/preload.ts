import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export type ServerStatus = 'starting' | 'ready' | 'restarting' | 'down';

export interface WorkspaceInfo {
  dataDir: string;
  logPath: string;
  version: string;
}

/**
 * The safe bridge between the web UI (renderer) and native capabilities. The
 * renderer reaches these as `window.forskai.*`; everything is feature-detected
 * there, so the same build still runs in a plain browser (where `window.forskai`
 * is undefined and the UI falls back to its web behaviour).
 *
 * This foundation exposes the recovery/transparency surface. File-picker,
 * output-folder and backup methods will extend the same `forskai` object.
 */
const api = {
  /** Restart the local engine (the bundled server). Resolves once it's back. */
  restartEngine: (): Promise<void> => ipcRenderer.invoke('forskai:restart'),
  /** Open the rolling log file in the OS default viewer. */
  showLogs: (): Promise<void> => ipcRenderer.invoke('forskai:open-logs'),
  /** Reveal the per-user data folder in Finder/Explorer. */
  revealDataFolder: (): Promise<void> => ipcRenderer.invoke('forskai:reveal-data'),
  /** Where data + logs live, plus the app version — for a Data & privacy panel. */
  getInfo: (): Promise<WorkspaceInfo> => ipcRenderer.invoke('forskai:get-info'),
  /**
   * Subscribe to engine lifecycle changes so the UI can show a calm
   * "Reconnecting…" banner instead of throwing when the server blips.
   * Returns an unsubscribe function.
   */
  onServerStatus: (cb: (status: ServerStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: ServerStatus) => cb(status);
    ipcRenderer.on('forskai:server-status', listener);
    return () => ipcRenderer.removeListener('forskai:server-status', listener);
  },
};

export type ForskaiBridge = typeof api;

contextBridge.exposeInMainWorld('forskai', api);
