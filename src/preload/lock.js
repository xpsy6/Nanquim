// Tela de senha: so consegue perguntar se a senha esta certa. Nao tem acesso a abas, historico nem nada.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lock', {
  info: () => ipcRenderer.invoke('lock:info'),
  attempt: (pw) => ipcRenderer.invoke('lock:try', String(pw || ''))
});
