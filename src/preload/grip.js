// Alca de arrastar na borda do painel lateral.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('grip', {
  start: (x) => ipcRenderer.send('grip:start', x),
  move: (x) => ipcRenderer.send('grip:move', x),
  end: () => ipcRenderer.send('grip:end'),
  reset: () => ipcRenderer.send('grip:reset'),
  onAccent: (cb) => ipcRenderer.on('grip:accent', (_e, c) => cb(c))
});
