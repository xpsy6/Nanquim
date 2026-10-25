// Roda em todas as abas, mas so libera a API nas paginas internas (nanquim://).
const { contextBridge, ipcRenderer, webFrame } = require('electron');

if (location.protocol === 'nanquim:') {
  contextBridge.exposeInMainWorld('nanquim', {
    api: (method, arg) => ipcRenderer.invoke('nq:api', method, arg),
    open: (url, newTab = false) => ipcRenderer.send('nq:open', url, newTab),
    on: (channel, cb) => {
      if (!['settings', 'downloads', 'update'].includes(channel)) return;
      ipcRenderer.on(channel, (_e, data) => cb(data));
    }
  });
}

// Pagina de login do Google: garante que os scripts da pagina vejam a mesma identidade
// enviada nos cabecalhos (a original do Electron). Se ja estiver certa, nao mexe em nada.
if (location.hostname === 'accounts.google.com') {
  try {
    const ua = ipcRenderer.sendSync('nq:google-ua');
    if (ua && navigator.userAgent !== ua) {
      const appVersion = ua.replace(/^Mozilla\//, '');
      webFrame.executeJavaScript(`(() => {
        const nav = Navigator.prototype;
        try { Object.defineProperty(nav, 'userAgent', { get: () => ${JSON.stringify(ua)}, configurable: true }); } catch (e) {}
        try { Object.defineProperty(nav, 'appVersion', { get: () => ${JSON.stringify(appVersion)}, configurable: true }); } catch (e) {}
      })();`).catch(() => {});
    }
  } catch { /* segue sem ajuste */ }
}
