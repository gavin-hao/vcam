import { ipcRenderer } from 'electron';
import { ipcMessage } from '../constants';
type BackgroundImages = { default: string[]; user: string[] };
// type ModelPath = { key: string; path: string };
export const api = {
  addBackgroundImage: () => ipcRenderer.invoke(ipcMessage.addBackgroundImage),
  savePhoto: (base64: string) => ipcRenderer.send(ipcMessage.savePhoto, base64),
  getBackgroundImages: () => ipcRenderer.send(ipcMessage.getBackgroundImages),
  onBackgroundImageUpdate: (callback: (filePaths: BackgroundImages) => void) =>
    ipcRenderer.on(ipcMessage.onBackgroundImageUpdate, (_event, value: BackgroundImages) => callback(value)),
  getModelFiles: () => ipcRenderer.invoke(ipcMessage.getModelFiles),
  openPhotosDir: () => ipcRenderer.send(ipcMessage.openPhotosDir),
  // getMediapipeWasmPath: () => ipcRenderer.invoke('getMediapipeWasmPath'),
} as const;
