import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#15161c',
    // Linux window managers read the taskbar icon from here; macOS/Windows use
    // the icon electron-builder embeds in the packaged app bundle instead.
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('project:save', async (_event, data: string) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Project',
    defaultPath: 'untitled-project.bfsproj.json',
    filters: [{ name: 'Beat Forge Project', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  await fs.writeFile(filePath, data, 'utf-8');
  return { ok: true, filePath };
});

ipcMain.handle('project:open', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Open Project',
    properties: ['openFile'],
    filters: [{ name: 'Beat Forge Project', extensions: ['json'] }],
  });
  if (canceled || filePaths.length === 0) return { ok: false };
  const data = await fs.readFile(filePaths[0], 'utf-8');
  return { ok: true, data, filePath: filePaths[0] };
});

ipcMain.handle('audio:exportWav', async (_event, buffer: ArrayBuffer) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Audio',
    defaultPath: 'untitled-mix.wav',
    filters: [{ name: 'WAV Audio', extensions: ['wav'] }],
  });
  if (canceled || !filePath) return { ok: false };
  await fs.writeFile(filePath, Buffer.from(buffer));
  return { ok: true, filePath };
});

ipcMain.handle('samples:importDialog', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Import Sample',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aiff'] }],
  });
  if (canceled || filePaths.length === 0) return { ok: false, files: [] };
  const files = await Promise.all(
    filePaths.map(async (p) => ({
      name: path.basename(p),
      data: (await fs.readFile(p)).toString('base64'),
    })),
  );
  return { ok: true, files };
});
