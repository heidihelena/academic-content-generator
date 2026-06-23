import { app, BrowserWindow, dialog, shell } from 'electron';
import { ChildProcess, fork } from 'child_process';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { get } from 'http';

/**
 * Electron main process. It boots the bundled NestJS server as a child (running
 * under Electron's own Node), waits for it to come up, then opens the content
 * calendar in a native window. Everything is local: data and OAuth tokens live
 * in the per-user app folder, never in the repo — so the tool can be shared
 * without leaking anyone's logins.
 */

// Fixed local port. The frontend is built with this exact API URL baked in
// (see the desktop build step), so the two always agree.
const PORT = 47615;
const API_ORIGIN = `http://127.0.0.1:${PORT}`;
const packaged = app.isPackaged;

/** Where the bundled server entry and frontend assets live. */
function serverEntry(): string {
  return packaged
    ? join(process.resourcesPath, 'server', 'main.js')
    : join(__dirname, '..', '..', 'server', 'dist', 'main.js');
}
function frontendIndex(): string {
  return packaged
    ? join(process.resourcesPath, 'frontend', 'index.html')
    : join(__dirname, '..', '..', 'content-calendar', 'dist', 'index.html');
}

let serverProc: ChildProcess | null = null;
let quitting = false;

function startServer(): void {
  const dataDir = app.getPath('userData');
  mkdirSync(dataDir, { recursive: true });

  serverProc = fork(serverEntry(), [], {
    // ELECTRON_RUN_AS_NODE makes the forked process behave as plain Node.
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      PERSISTENCE_DRIVER: 'file',
      FILE_STORE_PATH: join(dataDir, 'store.json'),
      UPLOADS_DIR: join(dataDir, 'uploads'),
      PUBLIC_BASE_URL: API_ORIGIN,
      VAULT_PATH: join(dataDir, 'vault'),
      VAULT_WATCH: 'false',
      IDEA_GENERATOR: 'mock',
      EMBEDDINGS_PROVIDER: 'mock',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProc.stdout?.on('data', (d) => process.stdout.write(`[server] ${d}`));
  serverProc.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));
  serverProc.on('exit', (code) => {
    if (code && !quitting) {
      dialog.showErrorBox('Server stopped', `The local server exited (code ${code}).`);
    }
  });
}

/** Resolve once the API answers, or reject after `timeoutMs`. */
function waitForServer(timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = get(`${API_ORIGIN}/api/posts`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error('Server did not start in time'));
      else setTimeout(ping, 400);
    };
    ping();
  });
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f4f1ea', // paper, so first paint isn't a white flash
    title: 'forskAI',
    webPreferences: { contextIsolation: true },
  });

  // Open external links (e.g. an OAuth consent page or a published post) in the
  // user's real browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  try {
    await waitForServer();
  } catch (err) {
    dialog.showErrorBox(
      'Could not start',
      `The local server didn't respond.\n\n${err instanceof Error ? err.message : err}`,
    );
  }
  await win.loadFile(frontendIndex());
}

// Single instance: focus the existing window instead of opening a second.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    startServer();
    void createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  quitting = true;
  serverProc?.kill();
});
