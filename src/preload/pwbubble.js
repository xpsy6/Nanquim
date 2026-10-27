// Balao "Salvar senha?": recebe os dados do login e devolve a escolha. Nao enxerga mais nada.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pwb', {
  on: (cb) => ipcRenderer.on('pwb:data', (_e, d) => cb(d)),
  act: (name, arg) => ipcRenderer.send('pwb:act', name, arg),
  size: (h) => ipcRenderer.send('pwb:size', h)
});
