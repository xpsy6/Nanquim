// Ponte entre a interface do navegador (barra de abas, endereco...) e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = ['state', 'downloads', 'metrics', 'find', 'command', 'update'];

contextBridge.exposeInMainWorld('nq', {
  platform: process.platform,
  send: (action, ...args) => ipcRenderer.send('ui:act', action, ...args),
  invoke: (action, ...args) => ipcRenderer.invoke('ui:invoke', action, ...args),
  on: (channel, cb) => {
    if (!CHANNELS.includes(channel)) return;
    ipcRenderer.on(channel, (_e, ...args) => cb(...args));
  }
});
