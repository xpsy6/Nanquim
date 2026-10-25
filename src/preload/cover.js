// Capa do painel lateral: aparece por cima do painel enquanto ele carrega ou quando algo deu errado.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cover', {
  on: (cb) => ipcRenderer.on('cover:data', (_e, d) => cb(d)),
  act: (name) => ipcRenderer.send('cover:act', name)
});
