import { app, BrowserWindow, Menu, dialog, ipcMain, shell, type MenuItemConstructorOptions } from 'electron';
import { ChildProcess, fork } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, type WriteStream } from 'fs';
import { join } from 'path';
import { get } from 'http';
import type { ServerStatus, WorkspaceInfo } from './preload';

/**
 * Electron main process. Boots the bundled NestJS server as a child, shows a
 * splash while it comes up, then opens the content calendar. Everything is
 * local: data and OAuth tokens live in the per-user app folder.
 *
 * Resilience (the bits a non-technical researcher relies on):
 *  - a splash window with live startup steps, so a slow boot never looks frozen;
 *  - rolling logs to a file they can open from the menu;
 *  - automatic restart with backoff if the engine crashes, and a recovery
 *    dialog (Restart / Show logs / Quit) only when restarts are exhausted —
 *    which also re-opens the window if the very first boot failed.
 */

const PORT = 47615;
const API_ORIGIN = `http://127.0.0.1:${PORT}`;
const packaged = app.isPackaged;
const MAX_RESTARTS = 3;
const BACKOFF_MS = [1000, 2000, 4000];

let serverProc: ChildProcess | null = null;
let quitting = false;
let restartCount = 0;
let recovering = false;
let mainWin: BrowserWindow | null = null;
let mainLoaded = false;
let splashWin: BrowserWindow | null = null;
let logStream: WriteStream | null = null;

/* ----------------------------------------------------------------- paths */
function dataDir(): string {
  return app.getPath('userData');
}
function logPath(): string {
  return join(dataDir(), 'logs', 'forskai.log');
}
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
function splashFile(): string {
  return join(__dirname, '..', 'splash.html');
}

/* ------------------------------------------------------------------ logs */
function openLog(): void {
  mkdirSync(join(dataDir(), 'logs'), { recursive: true });
  const p = logPath();
  try {
    // Keep one previous session around; don't let the log grow forever.
    if (existsSync(p) && statSync(p).size > 2_000_000) renameSync(p, `${p}.1`);
  } catch {
    /* non-fatal */
  }
  logStream = createWriteStream(p, { flags: 'a' });
  logStream.write(`\n--- session ${new Date().toISOString()} ---\n`);
}
function log(line: string): void {
  logStream?.write(line);
}

/* ------------------------------------------------------- status signalling */
function broadcastStatus(status: ServerStatus): void {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('forskai:server-status', status);
}
function setSplashStep(step: 's-engine' | 's-data' | 's-open'): void {
  if (!splashWin || splashWin.isDestroyed()) return;
  void splashWin.webContents
    .executeJavaScript(`window.__setStep && window.__setStep(${JSON.stringify(step)})`)
    .catch(() => {
      /* splash may already be gone */
    });
}

/* ---------------------------------------------------------------- server */
function startServer(): void {
  mkdirSync(dataDir(), { recursive: true });
  broadcastStatus(restartCount > 0 ? 'restarting' : 'starting');

  serverProc = fork(serverEntry(), [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      PERSISTENCE_DRIVER: 'file',
      FILE_STORE_PATH: join(dataDir(), 'store.json'),
      UPLOADS_DIR: join(dataDir(), 'uploads'),
      PUBLIC_BASE_URL: API_ORIGIN,
      VAULT_PATH: join(dataDir(), 'vault'),
      VAULT_WATCH: 'false',
      IDEA_GENERATOR: 'mock',
      EMBEDDINGS_PROVIDER: 'mock',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProc.stdout?.on('data', (d: Buffer) => {
    const s = `[server] ${d}`;
    process.stdout.write(s);
    log(s);
  });
  serverProc.stderr?.on('data', (d: Buffer) => {
    const s = `[server] ${d}`;
    process.stderr.write(s);
    log(s);
  });

  serverProc.on('exit', (code) => {
    if (quitting) return;
    log(`[desktop] engine exited (code ${code ?? 'unknown'})\n`);
    broadcastStatus('down');
    if (restartCount < MAX_RESTARTS) {
      const delay = BACKOFF_MS[Math.min(restartCount, BACKOFF_MS.length - 1)];
      restartCount += 1;
      log(`[desktop] restarting engine in ${delay}ms (attempt ${restartCount}/${MAX_RESTARTS})\n`);
      setTimeout(() => {
        if (!quitting) startServer();
      }, delay);
    } else {
      void showRecovery(`The local engine stopped unexpectedly (code ${code ?? 'unknown'}).`);
    }
  });
}

/**
 * Restart the engine on demand (menu / renderer / recovery). Detaches the old
 * exit handler so an intentional kill doesn't also trigger auto-restart.
 * Resolves to whether the engine came back up within the timeout.
 */
async function restartEngine(): Promise<boolean> {
  const old = serverProc;
  serverProc = null;
  restartCount = 0;
  if (old) {
    old.removeAllListeners('exit');
    old.kill();
  }
  startServer();
  broadcastStatus('restarting');
  try {
    await waitForServer();
    broadcastStatus('ready');
    return true;
  } catch {
    broadcastStatus('down');
    return false;
  }
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

/* -------------------------------------------------------------- recovery */
async function showRecovery(detail: string): Promise<void> {
  if (recovering) return;
  recovering = true;
  // Loop so "Show logs" can be picked without dismissing the choice.
  for (;;) {
    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: 'Workspace stopped',
      message: 'The workspace stopped unexpectedly.',
      detail: `${detail}\n\nYour saved work is safe — it’s stored on this computer.`,
      buttons: ['Restart', 'Show logs', 'Quit'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (response === 1) {
      await shell.openPath(logPath());
      continue;
    }
    recovering = false;
    if (response === 0) void recoverAndReopen();
    else {
      quitting = true;
      serverProc?.kill();
      app.quit();
    }
    return;
  }
}

/** Bring the engine back, then make sure a loaded window is on screen. */
async function recoverAndReopen(): Promise<void> {
  if (!(await restartEngine())) {
    void showRecovery('The engine did not come back up. Check the logs for details.');
    return;
  }
  if (!mainWin || mainWin.isDestroyed()) {
    await createWindow();
    return;
  }
  if (!mainLoaded) {
    try {
      await mainWin.loadFile(frontendIndex());
      mainWin.show();
      mainLoaded = true;
      closeSplash();
    } catch {
      void showRecovery('The workspace could not be opened.');
    }
  }
}

/* ----------------------------------------------------------------- menu */
async function showPrivacy(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'Privacy & data',
    message: 'Everything stays on this computer.',
    detail: `Your sources, drafts and connected-account tokens are stored only here:\n\n${dataDir()}\n\nNothing is uploaded anywhere. Account tokens are encrypted at rest.`,
    buttons: ['Reveal in Finder', 'Close'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (response === 0) shell.showItemInFolder(dataDir());
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'Workspace',
      submenu: [
        { label: 'Restart engine', click: () => void restartEngine() },
        { label: 'Show logs', click: () => void shell.openPath(logPath()) },
        { type: 'separator' },
        { label: 'Reveal data folder', click: () => shell.showItemInFolder(dataDir()) },
      ],
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: 'Privacy & where my data lives', click: () => void showPrivacy() }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* --------------------------------------------------------------- windows */
function createSplash(): void {
  splashWin = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    resizable: false,
    backgroundColor: '#f6f6f2',
    show: false,
    title: 'forskai',
    webPreferences: { contextIsolation: true },
  });
  splashWin.once('ready-to-show', () => splashWin?.show());
  splashWin.on('closed', () => {
    splashWin = null;
  });
  void splashWin.loadFile(splashFile());
}

function closeSplash(): void {
  if (splashWin && !splashWin.isDestroyed()) splashWin.destroy();
  splashWin = null;
}

/** Wait for the engine, then load + show the main window. Throws if the engine
 *  never answers (the caller turns that into the recovery dialog). */
async function bootWindow(): Promise<void> {
  if (!mainWin || mainWin.isDestroyed()) return;
  setSplashStep('s-data');
  await waitForServer();
  broadcastStatus('ready');
  setSplashStep('s-open');
  await mainWin.loadFile(frontendIndex());
  mainWin.show();
  mainLoaded = true;
  closeSplash();
}

async function createWindow(): Promise<void> {
  mainLoaded = false;
  mainWin = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f4f1ea',
    title: 'forskAI',
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  // Open external links (OAuth pages, published posts) in the real browser.
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWin.on('closed', () => {
    mainWin = null;
    mainLoaded = false;
  });

  try {
    await bootWindow();
  } catch (err) {
    closeSplash();
    await showRecovery(`The local engine didn’t respond.\n${err instanceof Error ? err.message : String(err)}`);
  }
}

/* -------------------------------------------------------------------- IPC */
function registerIpc(): void {
  ipcMain.handle('forskai:restart', () => restartEngine());
  ipcMain.handle('forskai:open-logs', () => shell.openPath(logPath()));
  ipcMain.handle('forskai:reveal-data', () => {
    shell.showItemInFolder(dataDir());
  });
  ipcMain.handle(
    'forskai:get-info',
    (): WorkspaceInfo => ({ dataDir: dataDir(), logPath: logPath(), version: app.getVersion() }),
  );
}

/* ------------------------------------------------------------- lifecycle */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = mainWin ?? BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    openLog();
    buildMenu();
    registerIpc();
    createSplash();
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
