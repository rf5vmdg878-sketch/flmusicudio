import { contextBridge, ipcRenderer } from 'electron';

export interface BeatForgeBridge {
  saveProject: (data: string) => Promise<{ ok: boolean; filePath?: string }>;
  openProject: () => Promise<{ ok: boolean; data?: string; filePath?: string }>;
  exportWav: (buffer: ArrayBuffer) => Promise<{ ok: boolean; filePath?: string }>;
  importSamples: () => Promise<{ ok: boolean; files: { name: string; data: string }[] }>;
}

const bridge: BeatForgeBridge = {
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportWav: (buffer) => ipcRenderer.invoke('audio:exportWav', buffer),
  importSamples: () => ipcRenderer.invoke('samples:importDialog'),
};

contextBridge.exposeInMainWorld('beatForge', bridge);
