// Nanquim: processo principal.
// Cuida de janelas, abas, paineis laterais, downloads, permissoes, historico e sessao.
const {
  app, BrowserWindow, WebContentsView, ipcMain, session, protocol, Menu, shell,
  clipboard, ClipboardItem, dialog, net, desktopCapturer, nativeImage, webContents, powerMonitor
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const store = require('./store');
// icones oficiais embutidos (conjunto livre CC0 de logos), para nao depender da internet
const BRAND = require('../assets/brand-icons.json');
const PANEL_BRAND = { whatsapp: 'whatsapp', instagram: 'instagram', discord: 'discord', spotify: 'spotify', telegram: 'telegram', ytmusic: 'youtube' };
const HOST_BRAND = {
  'youtube.com': 'youtube', 'music.youtube.com': 'youtube', 'mail.google.com': 'gmail', 'gmail.com': 'gmail',
  'github.com': 'github', 'instagram.com': 'instagram', 'web.whatsapp.com': 'whatsapp', 'whatsapp.com': 'whatsapp',
  'twitch.tv': 'twitch', 'netflix.com': 'netflix', 'discord.com': 'discord', 'open.spotify.com': 'spotify',
  'spotify.com': 'spotify', 'web.telegram.org': 'telegram', 'telegram.org': 'telegram', 'google.com': 'google',
  'linkedin.com': 'linkedin', 'x.com': 'x', 'twitter.com': 'x', 'notion.so': 'notion', 'figma.com': 'figma',
  'vercel.com': 'vercel', 'chatgpt.com': 'chatgpt'
};
const DARK_BRANDS = ['github', 'x', 'notion', 'vercel', 'chatgpt'];
function panelIconOf(p) { return (PANEL_BRAND[p.id] && BRAND[PANEL_BRAND[p.id]]) || p.icon || null; }
const adblock = require('./adblock');

const ROOT = path.join(__dirname, '..');
const PRELOAD_UI = path.join(ROOT, 'preload', 'ui.js');
const PRELOAD_INTERNAL = path.join(ROOT, 'preload', 'internal.js');
const PRELOAD_GRIP = path.join(ROOT, 'preload', 'grip.js');
const GRIP_HTML = path.join(ROOT, 'ui', 'grip.html');
const PRELOAD_COVER = path.join(ROOT, 'preload', 'cover.js');
const COVER_HTML = path.join(ROOT, 'ui', 'cover.html');
const GRIP_W = 16;
const PANEL_MIN = 300;
const PAGES_DIR = path.join(ROOT, 'pages');
const FONTS_DIR = path.join(ROOT, 'fonts');
const UI_HTML = path.join(ROOT, 'ui', 'index.html');
const ICON = path.join(ROOT, 'assets', 'icon.png');
const INTERNAL_PAGES = ['newtab', 'history', 'bookmarks', 'downloads', 'settings', 'erro'];
const NEWTAB = 'nanquim://newtab';

const SEARCH = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
};

const THEMES = {
  tinta: { bar: '#100f0d', fg: '#ebe3d3', page: '#191714', cover: '#1e1b17' },
  papel: { bar: '#e3dbca', fg: '#1d1a16', page: '#f3ede1', cover: '#f8f4ec' }
};
const PAGE_RADIUS = 10;

// ---------- login do Google ----------
// Quando o navegador diz que e o Chrome, o Google roda as checagens completas do Chrome e recusa o login.
// Quando ele se identifica como Electron (o que ele e), o Google usa o fluxo para navegadores embutidos,
// que deixa entrar. Entao: na pagina de login vai a identidade original do Electron; no resto, a do Chrome.
let ELECTRON_UA = '';
let CHROME_UA = '';
const GOOGLE_LOGIN_HOST = 'accounts.google.com';
function hostOfUrl(u) { try { return new URL(u).hostname; } catch { return ''; } }
function isGoogleLogin(u) { return hostOfUrl(u) === GOOGLE_LOGIN_HOST; }
// troca a identidade da aba quando ela entra ou sai da pagina de login
function syncUserAgent(wc, url) {
  if (!ELECTRON_UA || wc.isDestroyed()) return;
  const want = isGoogleLogin(url) ? ELECTRON_UA : CHROME_UA;
  if (wc.getUserAgent() !== want) wc.setUserAgent(want);
}
function watchUserAgent(wc) {
  wc.on('did-start-navigation', (e) => { if (e.isMainFrame && !e.isSameDocument) syncUserAgent(wc, e.url); });
}

const ZOOMS = [0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

// ---------- inicializacao do app ----------

protocol.registerSchemesAsPrivileged([
  { scheme: 'nanquim', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

app.commandLine.appendSwitch('lang', 'pt-BR');
app.setName('Nanquim');
if (process.platform === 'win32') app.setAppUserModelId('com.felipemisso.nanquim');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const S = () => store.settings.data;
let tabSeq = 0;
let winSeq = 0;
let sessionLocked = false;
const windows = new Set();

// ---------- utilidades ----------

function themeOf() { return THEMES[S().theme] || THEMES.tinta; }

function looksLikeUrl(text) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/^(nanquim|about|view-source|data|file|mailto):/i.test(text)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(text)) return true;
  return /^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(text);
}

function toUrl(input) {
  const text = String(input || '').trim();
  if (!text) return null;
  if (looksLikeUrl(text)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^localhost:/i.test(text)) return text;
    const local = /^(localhost|(\d{1,3}\.){3}\d{1,3})/i.test(text);
    return (local ? 'http://' : 'https://') + text;
  }
  return searchUrl(text);
}

function searchUrl(q) {
  const eng = SEARCH[S().searchEngine] || SEARCH.google;
  return eng.url + encodeURIComponent(q);
}

function displayUrl(url) {
  if (!url) return '';
  if (url.startsWith(NEWTAB)) return '';
  if (url.startsWith('nanquim://erro')) {
    try { return new URL(url).searchParams.get('u') || url; } catch { return url; }
  }
  return url;
}

function uniquePath(dir, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let p = path.join(dir, name);
  let i = 1;
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${i++})${ext}`);
  return p;
}

function isInternalSender(e) {
  try { return e.sender.getURL().startsWith('nanquim://'); } catch { return false; }
}

function allWindows() { return [...windows].filter(w => !w.isDestroyed()); }

function findTabByWc(wcId) {
  for (const win of allWindows()) {
    const tab = win.nq.tabs.find(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === wcId);
    if (tab) return { win, tab };
  }
  return null;
}

// ---------- paginas internas (nanquim://) ----------

function internalHandler(request) {
  const u = new URL(request.url);
  let host = u.hostname;
  const p = decodeURIComponent(u.pathname);
  if (host === 'favicon') return faviconResponse(p);
  let file;
  if (p.startsWith('/fonts/')) file = path.join(FONTS_DIR, path.basename(p));
  else if (p === '/' || p === '') {
    if (!INTERNAL_PAGES.includes(host)) host = 'newtab';
    file = path.join(PAGES_DIR, host + '.html');
  } else file = path.join(PAGES_DIR, path.basename(p));
  return net.fetch(pathToFileURL(file).toString());
}

// ---------- icones das abas ----------
// Cada site visitado tem o icone guardado (por endereco). Assim as abas dormindo, e as que voltam
// ao abrir o Nanquim, mostram o icone sem precisar carregar a pagina. Para sites que ainda nao
// tem icone guardado, ele e buscado por tras. A interface pede os icones por nanquim://favicon/,
// com um codigo que muda a cada vez que o Nanquim abre, para os sites nao conseguirem espiar a lista.
const FAV_TOKEN = require('crypto').randomBytes(9).toString('hex');
const FAV_MAX = 300;
const favMiss = new Map();
const favQueue = new Map();
let favRunning = 0;

function iconHost(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.toLowerCase() : '';
  } catch { return ''; }
}
const iconKey = (host) => host.replace(/^www\./, '');
function brandKeyOf(key) { return HOST_BRAND[key] || HOST_BRAND[key.split('.').slice(-2).join('.')] || null; }

// referencia curta do icone de um endereco (ou null): { src, mono }
function iconRef(url) {
  const host = iconHost(url);
  if (!host) return null;
  const key = iconKey(host);
  const c = store.favicons.data[key];
  if (c && c.b) return { src: `nanquim://favicon/${FAV_TOKEN}/${encodeURIComponent(key)}?v=${c.t}`, mono: false };
  const bk = brandKeyOf(key);
  if (bk && BRAND[bk]) return { src: `nanquim://favicon/${FAV_TOKEN}/${encodeURIComponent(key)}?v=m`, mono: DARK_BRANDS.includes(bk) };
  return null;
}

function faviconResponse(p) {
  const [, token, raw] = p.split('/');
  const key = raw || '';
  let type = '', buf = null;
  if (token === FAV_TOKEN) {
    const c = store.favicons.data[key];
    if (c && c.b) { type = c.y; buf = Buffer.from(c.b, 'base64'); }
    else {
      const bk = brandKeyOf(key);
      const m = bk && BRAND[bk] && /^data:([^;,]+)(;base64)?,(.*)$/s.exec(BRAND[bk]);
      if (m) { type = m[1]; buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3])); }
    }
  }
  if (!buf) return new Response('', { status: 404 });
  return new Response(buf, { headers: { 'content-type': type, 'cache-control': 'max-age=604800' } });
}

function storeIcon(key, dataUrl, from) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m || m[2].length > 90000) return false;
  store.favicons.data[key] = { y: m[1], b: m[2], u: from || '', t: Date.now() };
  const all = Object.entries(store.favicons.data);
  if (all.length > FAV_MAX) {
    all.sort((a, b) => a[1].t - b[1].t);
    for (const [k] of all.slice(0, all.length - FAV_MAX)) delete store.favicons.data[k];
  }
  store.favicons.save();
  return true;
}

// a pagina mostrou um icone: guarda (so janelas normais, nunca as anonimas)
function rememberIcon(pageUrl, iconUrl) {
  const host = iconHost(pageUrl);
  if (!host || !iconUrl || iconUrl.startsWith('data:') && iconUrl.length > 120000) return;
  const key = iconKey(host);
  const c = store.favicons.data[key];
  if (c && c.u === iconUrl && Date.now() - c.t < 7 * 86400000) return;
  const got = iconUrl.startsWith('data:') ? Promise.resolve(iconUrl) : fetchIcon(iconUrl);
  got.then(d => { if (d && storeIcon(key, d, iconUrl)) broadcastState(); });
}

// aba dormindo sem icone guardado: busca por tras (no maximo 3 de cada vez)
function wantIcon(url) {
  const host = iconHost(url);
  if (!host) return;
  const key = iconKey(host);
  if (store.favicons.data[key] || favQueue.has(key)) return;
  const miss = favMiss.get(key);
  if (miss && Date.now() - miss < 3600000) return;
  favQueue.set(key, host);
  pumpIcons();
}

function pumpIcons() {
  while (favRunning < 3 && favQueue.size) {
    const [key, host] = favQueue.entries().next().value;
    favQueue.delete(key);
    favRunning++;
    (async () => {
      const d = await fetchIcon(`https://${host}/favicon.ico`) ||
        await fetchIcon(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`);
      if (d && storeIcon(key, d, '')) broadcastState();
      else if (!d) favMiss.set(key, Date.now());
      favRunning--;
      pumpIcons();
    })();
  }
}

// ---------- sessoes (normal, anonima e paineis) ----------

const preparedSessions = new WeakSet();
const ASK_PERMS = {
  media: 'usar sua câmera e/ou microfone',
  geolocation: 'saber sua localização',
  notifications: 'mostrar notificações',
  midiSysex: 'controlar dispositivos MIDI',
  'idle-detection': 'saber quando você está inativo'
};

function prepareSession(ses, isPrivate) {
  if (preparedSessions.has(ses)) return;
  preparedSessions.add(ses);
  try { ses.protocol.handle('nanquim', internalHandler); } catch { /* ja registrado */ }
  adblock.attach(ses);
  // a pagina de login do Google e tudo que ela carrega usam a identidade do Electron
  ses.webRequest.onBeforeSendHeaders({ urls: ['https://*/*'] }, (details, cb) => {
    const h = details.requestHeaders;
    let page = '';
    try { page = details.webContents && !details.webContents.isDestroyed() ? details.webContents.getURL() : ''; } catch { /* ignorado */ }
    if (ELECTRON_UA && (isGoogleLogin(details.url) || isGoogleLogin(page) || isGoogleLogin(details.referrer || ''))) {
      for (const k of Object.keys(h)) if (/^user-agent$/i.test(k)) delete h[k];
      h['User-Agent'] = ELECTRON_UA;
    }
    cb({ requestHeaders: h });
  });
  setupDownloads(ses, isPrivate);
  try { ses.setSpellCheckerLanguages(['pt-BR', 'en-US']); } catch { /* Windows usa o corretor do sistema */ }

  ses.setPermissionRequestHandler(async (wc, permission, callback, details) => {
    if (!ASK_PERMS[permission]) return callback(true);
    let origin = '';
    try { origin = new URL(details.requestingUrl || wc.getURL()).origin; } catch { return callback(false); }
    const saved = store.permissions.data[origin] && store.permissions.data[origin][permission];
    if (saved !== undefined && !isPrivate) return callback(saved);
    const win = BrowserWindow.fromWebContents(wc) || findTabByWc(wc.id)?.win || BrowserWindow.getFocusedWindow();
    const opts = {
      type: 'question',
      buttons: ['Permitir', 'Bloquear'],
      defaultId: 0,
      cancelId: 1,
      title: 'Permissão',
      message: `${origin.replace(/^https?:\/\//, '')} quer ${ASK_PERMS[permission]}.`,
      checkboxLabel: isPrivate ? undefined : 'Lembrar a escolha para este site',
      checkboxChecked: !isPrivate
    };
    const r = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
    const allow = r.response === 0;
    if (!isPrivate && r.checkboxChecked) {
      store.permissions.data[origin] = { ...(store.permissions.data[origin] || {}), [permission]: allow };
      store.permissions.save();
    }
    callback(allow);
  });

  ses.setPermissionCheckHandler((wc, permission, origin) => {
    if (!ASK_PERMS[permission]) return true;
    let o = origin;
    try { o = new URL(origin).origin; } catch { /* mantem */ }
    return !!(store.permissions.data[o] && store.permissions.data[o][permission]);
  });

  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    if (!sources.length) return callback({});
    const win = BrowserWindow.getFocusedWindow();
    const opts = {
      type: 'question',
      buttons: ['Compartilhar tela inteira', 'Cancelar'],
      cancelId: 1,
      message: 'Este site quer compartilhar sua tela.'
    };
    const r = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
    if (r.response !== 0) return callback({});
    const screenSrc = sources.find(s => s.id.startsWith('screen')) || sources[0];
    callback(process.platform === 'win32' ? { video: screenSrc, audio: 'loopback' } : { video: screenSrc });
  });
}

// ---------- downloads ----------

let dlSeq = 0;
let dlList = [];
let dlTimer = null;

function dlPublic(d) {
  return {
    id: d.id, filename: d.filename, url: d.url, savePath: d.savePath, total: d.total,
    received: d.received, state: d.state, paused: d.paused, speed: d.speed, start: d.start,
    exists: d.state === 'completed' ? fs.existsSync(d.savePath || '') : undefined
  };
}

function pushDownloads(now) {
  const send = () => {
    dlTimer = null;
    const list = dlList.slice(0, 60).map(dlPublic);
    for (const w of allWindows()) w.webContents.send('downloads', list);
    for (const wc of webContents.getAllWebContents()) {
      try { if (wc.getURL().startsWith('nanquim://downloads')) wc.send('downloads', list); } catch { /* ignorado */ }
    }
  };
  if (now) { clearTimeout(dlTimer); send(); }
  else if (!dlTimer) dlTimer = setTimeout(send, 250);
}

function persistDownloads() {
  store.downloads.data = dlList
    .filter(d => !d.private && d.state !== 'progressing')
    .slice(0, 300)
    .map(d => ({ ...dlPublic(d), exists: undefined }));
  store.downloads.save();
}

function setupDownloads(ses, isPrivate) {
  ses.on('will-download', (e, item, wc) => {
    const s = S();
    const dir = s.downloadDir && fs.existsSync(s.downloadDir) ? s.downloadDir : app.getPath('downloads');
    if (!s.askDownload) item.setSavePath(uniquePath(dir, item.getFilename()));
    const d = {
      id: ++dlSeq, filename: item.getFilename(), url: item.getURL(), savePath: item.getSavePath(),
      total: item.getTotalBytes(), received: 0, state: 'progressing', paused: false,
      start: Date.now(), speed: 0, private: isPrivate, item, lastBytes: 0, lastTime: Date.now()
    };
    dlList.unshift(d);
    item.on('updated', (ev, state) => {
      const now = Date.now();
      d.received = item.getReceivedBytes();
      d.total = item.getTotalBytes();
      d.paused = item.isPaused();
      d.state = state === 'interrupted' ? 'interrupted' : 'progressing';
      if (item.getSavePath()) { d.savePath = item.getSavePath(); d.filename = path.basename(d.savePath); }
      if (now - d.lastTime >= 700) {
        d.speed = Math.max(0, (d.received - d.lastBytes) / ((now - d.lastTime) / 1000));
        d.lastBytes = d.received; d.lastTime = now;
      }
      pushDownloads();
    });
    item.once('done', (ev, state) => {
      d.state = state;
      d.received = item.getReceivedBytes();
      d.savePath = item.getSavePath() || d.savePath;
      d.filename = path.basename(d.savePath || d.filename);
      d.item = null;
      persistDownloads();
      pushDownloads(true);
    });
    for (const w of allWindows()) w.webContents.send('command', { cmd: 'downloadStarted' });
    pushDownloads(true);
  });
}

function downloadAction(id, action) {
  if (action === 'clear') {
    dlList = dlList.filter(x => x.state === 'progressing');
    persistDownloads();
    return pushDownloads(true);
  }
  const d = dlList.find(x => x.id === id);
  if (!d) return;
  switch (action) {
    case 'open': if (d.savePath) shell.openPath(d.savePath); break;
    case 'show': if (d.savePath) shell.showItemInFolder(d.savePath); break;
    case 'pause': d.item && d.item.pause(); break;
    case 'resume': d.item && d.item.canResume() && d.item.resume(); break;
    case 'cancel': d.item && d.item.cancel(); break;
    case 'retry': session.defaultSession.downloadURL(d.url); break;
    case 'remove': dlList = dlList.filter(x => x !== d); persistDownloads(); break;
    case 'clear': dlList = dlList.filter(x => x.state === 'progressing'); persistDownloads(); break;
  }
  pushDownloads(true);
}

// ---------- historico e favoritos ----------

let histSeq = 0;

function addHistory(win, url, title) {
  if (win.nq.isPrivate || !/^https?:/.test(url)) return;
  const list = store.history.data;
  const last = list[list.length - 1];
  if (last && last.url === url && Date.now() - last.time < 30 * 60 * 1000) {
    last.time = Date.now();
    if (title) last.title = title;
  } else {
    list.push({ id: Date.now() * 100 + (histSeq++ % 100), url, title: title || url, time: Date.now() });
    if (list.length > 15000) list.splice(0, list.length - 15000);
  }
  store.history.save();
}

function updateHistoryTitle(url, title) {
  const list = store.history.data;
  for (let i = list.length - 1; i >= Math.max(0, list.length - 20); i--) {
    if (list[i].url === url) { list[i].title = title; store.history.save(); return; }
  }
}

function findBookmark(url) { return store.bookmarks.data.find(b => b.url === url); }

function addBookmark(url, title, favicon) {
  if (!url || findBookmark(url)) return;
  store.bookmarks.data.push({ id: Date.now(), url, title: title || url, favicon: favicon || null, created: Date.now() });
  store.bookmarks.save();
  broadcastState();
}

function removeBookmark(id) {
  store.bookmarks.data = store.bookmarks.data.filter(b => b.id !== id);
  store.bookmarks.save();
  broadcastState();
}

// ---------- estado enviado para a interface ----------

function navState(win) {
  const tab = activeTab(win);
  if (!tab) return null;
  const wc = tab.view && !tab.view.webContents.isDestroyed() ? tab.view.webContents : null;
  const h = wc && wc.navigationHistory;
  const onError = tab.url.startsWith('nanquim://erro');
  const shown = displayUrl(tab.url);
  return {
    url: shown,
    internal: tab.url.startsWith('nanquim://') && !onError,
    canBack: h ? (onError ? h.canGoToOffset(-2) : h.canGoBack()) : false,
    canFwd: h ? h.canGoForward() : false,
    loading: tab.loading,
    zoom: wc ? Math.round(wc.getZoomFactor() * 100) : 100,
    bookmarked: !!findBookmark(shown),
    blocked: wc ? adblock.countFor(wc.id) : 0,
    shieldOff: S().adblock ? adblock.isAllowedSite(shown) : true,
    secure: shown.startsWith('https://'),
    insecure: shown.startsWith('http://')
  };
}

function buildState(win) {
  const s = S();
  const nq = win.nq;
  return {
    private: nq.isPrivate,
    platform: process.platform,
    activeId: nq.activeId,
    tabs: nq.tabs.map(t => {
      // icone da propria pagina quando ela esta aberta; senao, o icone guardado do site
      let ic = t.favicon ? { src: t.favicon, mono: false, live: true } : null;
      if (!ic && t.url && /^https?:/.test(t.url)) {
        ic = iconRef(t.url);
        if (!ic && !nq.isPrivate) wantIcon(t.url);
      }
      return {
        id: t.id, title: t.title, url: displayUrl(t.url), favicon: ic ? ic.src : null, faviconMono: !!(ic && ic.mono),
        faviconBackup: ic && ic.live && /^https?:/.test(t.url) ? (iconRef(t.url) || {}).src || null : null,
        loading: t.loading, audible: t.audible, muted: t.muted, discarded: t.discarded, pinned: t.pinned, crashed: t.crashed
      };
    }),
    nav: navState(win),
    bookmarks: store.bookmarks.data.map(b => ({ id: b.id, title: b.title, url: b.url, favicon: (iconRef(b.url) || {}).src || b.favicon })),
    settings: {
      theme: s.theme, accent: s.accent, enso: s.enso, bookmarksBar: s.bookmarksBar,
      sidebar: s.sidebar && !nq.isPrivate, adblock: s.adblock
    },
    panels: nq.isPrivate ? [] : s.panels.filter(p => p.enabled).map(p => ({
      id: p.id, name: p.name, short: p.short, url: p.url, icon: panelIconOf(p),
      loaded: nq.panelViews.has(p.id)
    })),
    panelOpen: nq.panelOpen,
    lockOn: lockEnabled(),
    findOpen: nq.findOpen,
    blockedTotal: adblock.total
  };
}

function sendState(win) {
  if (!win || win.isDestroyed() || win.nq.stateQueued) return;
  win.nq.stateQueued = true;
  setImmediate(() => {
    if (win.isDestroyed()) return;
    win.nq.stateQueued = false;
    win.webContents.send('state', buildState(win));
  });
}

function broadcastState() { allWindows().forEach(sendState); }

function broadcastSettings() {
  broadcastState();
  const t = themeOf();
  for (const w of allWindows()) {
    if (w.nq.grip && !w.nq.grip.webContents.isDestroyed()) w.nq.grip.webContents.send('grip:accent', S().accent);
    if (w.nq.cover && !w.nq.cover.webContents.isDestroyed()) { w.nq.cover.setBackgroundColor(t.cover); pushCover(w); }
    if (process.platform !== 'darwin') {
      try { w.setTitleBarOverlay({ color: t.bar, symbolColor: t.fg, height: 46 }); } catch { /* ignorado */ }
    }
    w.setBackgroundColor(t.page);
  }
  for (const wc of webContents.getAllWebContents()) {
    try { if (wc.getURL().startsWith('nanquim://')) wc.send('settings', publicSettings()); } catch { /* ignorado */ }
  }
}

function publicSettings() {
  const s = S();
  const brandIcons = {};
  for (const [host, key] of Object.entries(HOST_BRAND)) if (BRAND[key]) brandIcons[host] = BRAND[key];
  return {
    ...s, windowBounds: undefined, searchEngines: SEARCH,
    panels: s.panels.map(p => ({ ...p, icon: panelIconOf(p) })),
    brandIcons, darkBrands: DARK_BRANDS.map(k => BRAND[k]).filter(Boolean)
  };
}

// ---------- abas ----------

function tabById(win, id) { return win.nq.tabs.find(t => t.id === id); }
function activeTab(win) { return tabById(win, win.nq.activeId); }

function createView(win, tab) {
  const view = new WebContentsView({
    webPreferences: {
      session: win.nq.session,
      preload: PRELOAD_INTERNAL,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true
    }
  });
  view.setBackgroundColor(tab.url.startsWith('nanquim://') ? themeOf().page : '#ffffff');
  try { view.setBorderRadius(PAGE_RADIUS); } catch { /* versoes antigas */ }
  tab.view = view;
  tab.discarded = false;
  tab.crashed = false;
  wireTab(win, tab);
  return view;
}

function createTab(win, url, opts = {}) {
  const nq = win.nq;
  const target = url ? (toUrl(url) || NEWTAB) : NEWTAB;
  const tab = {
    id: ++tabSeq, url: target, title: opts.title || (target === NEWTAB ? 'Nova aba' : displayUrl(target)),
    favicon: opts.favicon || null, loading: false, audible: false, muted: false,
    discarded: false, pinned: !!opts.pinned, crashed: false, lastActive: Date.now(), view: null
  };
  let index = nq.tabs.length;
  if (typeof opts.index === 'number') index = opts.index;
  else if (opts.afterId) {
    const i = nq.tabs.findIndex(t => t.id === opts.afterId);
    if (i >= 0) {
      // abre depois das abas ja abertas pelo mesmo link, como o Chrome faz
      index = i + 1;
      while (index < nq.tabs.length && nq.tabs[index].openerId === opts.afterId) index++;
      tab.openerId = opts.afterId;
    }
  }
  nq.tabs.splice(index, 0, tab);
  if (opts.lazy) {
    tab.discarded = true;
  } else {
    createView(win, tab);
    tab.view.webContents.loadURL(target);
  }
  if (opts.active !== false) activateTab(win, tab.id);
  else sendState(win);
  scheduleSessionSave();
  return tab;
}

function activateTab(win, id) {
  const nq = win.nq;
  const tab = tabById(win, id);
  if (!tab) return;
  const prev = activeTab(win);
  if (prev && prev !== tab) {
    if (nq.findOpen) closeFind(win);
    if (prev.view) { try { win.contentView.removeChildView(prev.view); } catch { /* ja removida */ } }
  }
  nq.activeId = id;
  tab.lastActive = Date.now();
  if (!tab.view) {
    createView(win, tab);
    tab.view.webContents.loadURL(tab.url);
  }
  win.contentView.addChildView(tab.view);
  raisePanel(win);
  applyLayout(win);
  if (tab.url === NEWTAB) {
    win.webContents.focus();
    win.webContents.send('command', { cmd: 'focusAddress' });
  } else if (!nq.frozen) {
    tab.view.webContents.focus();
  }
  sendState(win);
  scheduleSessionSave();
}

function destroyView(win, tab) {
  if (!tab.view) return;
  try { win.contentView.removeChildView(tab.view); } catch { /* ignorado */ }
  try { if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close(); } catch { /* ignorado */ }
  tab.view = null;
}

function closeTab(win, id) {
  const nq = win.nq;
  const idx = nq.tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  const tab = nq.tabs[idx];
  if (!nq.isPrivate && tab.url !== NEWTAB) {
    nq.closed.push({ url: displayUrl(tab.url) || tab.url, title: tab.title, index: idx });
    if (nq.closed.length > 25) nq.closed.shift();
  }
  nq.tabs.splice(idx, 1);
  destroyView(win, tab);
  if (!nq.tabs.length) { win.close(); return; }
  if (nq.activeId === id) {
    const opener = tab.openerId && tabById(win, tab.openerId);
    const next = opener || nq.tabs[Math.min(idx, nq.tabs.length - 1)];
    nq.activeId = null;
    activateTab(win, next.id);
  } else sendState(win);
  scheduleSessionSave();
}

function discardTab(win, tab) {
  if (!tab.view || tab.id === win.nq.activeId || tab.audible) return false;
  destroyView(win, tab);
  tab.discarded = true;
  tab.loading = false;
  sendState(win);
  return true;
}

function moveTab(win, id, index) {
  const nq = win.nq;
  const from = nq.tabs.findIndex(t => t.id === id);
  if (from < 0) return;
  const [tab] = nq.tabs.splice(from, 1);
  nq.tabs.splice(Math.max(0, Math.min(index, nq.tabs.length)), 0, tab);
  sendState(win);
  scheduleSessionSave();
}

function reopenClosed(win) {
  const c = win.nq.closed.pop();
  if (c) createTab(win, c.url, { index: Math.min(c.index, win.nq.tabs.length) });
}

function goBack(tab) {
  const wc = tab.view && tab.view.webContents;
  if (!wc) return;
  const h = wc.navigationHistory;
  if (tab.url.startsWith('nanquim://erro')) { if (h.canGoToOffset(-2)) h.goToOffset(-2); }
  else if (h.canGoBack()) h.goBack();
}

function goForward(tab) {
  const wc = tab.view && tab.view.webContents;
  if (wc && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
}

function navigate(win, input, tab = activeTab(win)) {
  const url = toUrl(input);
  if (!url || !tab) return;
  tab.url = url;
  if (!tab.view) createView(win, tab);
  if (!win.contentView.children.includes(tab.view) && tab.id === win.nq.activeId) {
    win.contentView.addChildView(tab.view);
    raisePanel(win);
    applyLayout(win);
  }
  tab.view.webContents.loadURL(url);
  tab.view.webContents.focus();
}

function setZoom(tab, dir) {
  const wc = tab && tab.view && tab.view.webContents;
  if (!wc) return;
  const cur = wc.getZoomFactor();
  let next = 1;
  if (dir > 0) next = ZOOMS.find(z => z > cur + 0.001) || ZOOMS[ZOOMS.length - 1];
  else if (dir < 0) next = [...ZOOMS].reverse().find(z => z < cur - 0.001) || ZOOMS[0];
  wc.setZoomFactor(next);
}

function wireTab(win, tab) {
  const wc = tab.view.webContents;
  watchUserAgent(wc);
  const update = () => sendState(win);

  wc.on('did-start-loading', () => { tab.loading = true; update(); });
  wc.on('did-stop-loading', () => { tab.loading = false; update(); });

  wc.on('did-start-navigation', (e) => {
    if (!e.isMainFrame || e.isSameDocument) return;
    adblock.resetCount(wc.id);
    const internal = e.url.startsWith('nanquim://');
    tab.view && tab.view.setBackgroundColor(internal ? themeOf().page : '#ffffff');
  });

  wc.on('did-navigate', (e, url) => {
    tab.url = url;
    tab.favicon = null;
    if (url === NEWTAB) tab.title = 'Nova aba';
    addHistory(win, url, wc.getTitle());
    update();
    scheduleSessionSave();
  });

  wc.on('did-navigate-in-page', (e, url, isMainFrame) => {
    if (!isMainFrame) return;
    tab.url = url;
    addHistory(win, url, wc.getTitle());
    update();
    scheduleSessionSave();
  });

  wc.on('page-title-updated', (e, title) => {
    tab.title = title || displayUrl(tab.url) || 'Nova aba';
    if (/^https?:/.test(tab.url) && !win.nq.isPrivate) updateHistoryTitle(tab.url, title);
    update();
    scheduleSessionSave();
  });

  wc.on('page-favicon-updated', (e, favicons) => {
    tab.favicon = favicons && favicons[0] || null;
    if (tab.favicon && !win.nq.isPrivate) rememberIcon(wc.getURL(), tab.favicon);
    update();
  });

  wc.on('audio-state-changed', (e) => { tab.audible = e.audible; update(); });

  wc.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || url.startsWith('nanquim://')) return;
    const q = new URLSearchParams({ u: url, c: String(code), d: desc });
    wc.loadURL('nanquim://erro/?' + q.toString());
  });

  wc.on('render-process-gone', (e, details) => {
    if (details.reason === 'clean-exit') return;
    tab.crashed = true;
    const q = new URLSearchParams({ u: displayUrl(tab.url), c: 'crash', d: details.reason });
    setTimeout(() => { if (!wc.isDestroyed()) wc.loadURL('nanquim://erro/?' + q.toString()); }, 50);
    update();
  });

  wc.on('dom-ready', () => { if (S().adblock) adblock.decorate(wc); });

  wc.on('found-in-page', (e, r) => {
    if (tab.id === win.nq.activeId) win.webContents.send('find', { active: r.activeMatchOrdinal, total: r.matches });
  });

  wc.on('zoom-changed', (e, dir) => { setZoom(tab, dir === 'in' ? 1 : -1); update(); });

  wc.on('enter-html-full-screen', () => {
    win.nq.htmlFull = tab.id;
    if (!win.isFullScreen()) { win.nq.fsByPage = true; win.setFullScreen(true); }
    applyLayout(win);
  });
  wc.on('leave-html-full-screen', () => {
    win.nq.htmlFull = null;
    if (win.nq.fsByPage) { win.nq.fsByPage = false; win.setFullScreen(false); }
    applyLayout(win);
  });

  wc.on('before-input-event', (e, input) => { if (handleKey(win, input, false)) e.preventDefault(); });

  // clicar na pagina fecha o painel que esta por cima (a nao ser que ele esteja fixado)
  wc.on('input-event', (e, input) => {
    if (input.type === 'mouseDown' && win.nq.panelOpen && !S().panelPinned && tab.id === win.nq.activeId) closePanel(win);
  });

  wc.on('context-menu', (e, params) => pageMenu(win, tab, params));

  wc.setWindowOpenHandler(({ url, disposition, features }) => {
    if (disposition === 'new-window' && features) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 540, height: 700, autoHideMenuBar: true, backgroundColor: '#ffffff', icon: ICON,
          webPreferences: { session: win.nq.session, preload: PRELOAD_INTERNAL, contextIsolation: true, sandbox: true }
        }
      };
    }
    createTab(win, url, { active: disposition !== 'background-tab', afterId: tab.id });
    return { action: 'deny' };
  });

  wc.on('did-create-window', (popup) => {
    popup.setMenu(null);
    watchUserAgent(popup.webContents);
    syncUserAgent(popup.webContents, popup.webContents.getURL());
    popup.webContents.setWindowOpenHandler(({ url }) => {
      createTab(win, url, { afterId: tab.id });
      return { action: 'deny' };
    });
  });
}

// ---------- menus ----------

function pageMenu(win, tab, p) {
  const wc = tab.view.webContents;
  const items = [];
  const sep = () => { if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' }); };

  if (p.misspelledWord) {
    for (const s of p.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) });
    if (!p.dictionarySuggestions.length) items.push({ label: 'Sem sugestões', enabled: false });
    items.push({ label: 'Adicionar ao dicionário', click: () => wc.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
    sep();
  }
  if (p.linkURL) {
    items.push(
      { label: 'Abrir link em nova aba', click: () => createTab(win, p.linkURL, { active: false, afterId: tab.id }) },
      { label: 'Abrir link em nova janela', click: () => createWindow({ urls: [p.linkURL] }) },
      { label: 'Abrir link em janela anônima', click: () => createWindow({ isPrivate: true, urls: [p.linkURL] }) },
      { label: 'Salvar link como...', click: () => wc.downloadURL(p.linkURL) },
      { label: 'Copiar endereço do link', click: () => copyText(p.linkURL) }
    );
    sep();
  }
  if (p.mediaType === 'image' && p.srcURL) {
    items.push(
      { label: 'Abrir imagem em nova aba', click: () => createTab(win, p.srcURL, { active: false, afterId: tab.id }) },
      { label: 'Salvar imagem como...', click: () => wc.downloadURL(p.srcURL) },
      { label: 'Copiar imagem', click: () => wc.copyImageAt(p.x, p.y) },
      { label: 'Copiar endereço da imagem', click: () => copyText(p.srcURL) }
    );
    sep();
  }
  if (p.mediaType === 'video') {
    items.push(
      {
        label: 'Assistir em janela flutuante',
        click: () => wc.executeJavaScript(`(() => {
          const el = document.elementFromPoint(${p.x}, ${p.y});
          const v = (el && (el.closest('video') || el.querySelector && el.querySelector('video'))) || document.querySelector('video');
          if (v) v.requestPictureInPicture().catch(() => {});
        })()`, true)
      },
      { label: p.mediaFlags.isLooping ? 'Desligar repetição' : 'Repetir', click: () => wc.executeJavaScript(`(() => { const v = document.elementFromPoint(${p.x}, ${p.y}); const x = v && v.closest('video'); if (x) x.loop = !x.loop; })()`) }
    );
    if (p.srcURL && /^https?:/.test(p.srcURL)) items.push({ label: 'Salvar vídeo como...', click: () => wc.downloadURL(p.srcURL) });
    sep();
  }
  if (p.isEditable) {
    items.push(
      { label: 'Desfazer', role: 'undo', enabled: p.editFlags.canUndo },
      { label: 'Refazer', role: 'redo', enabled: p.editFlags.canRedo },
      { type: 'separator' },
      { label: 'Recortar', role: 'cut', enabled: p.editFlags.canCut },
      { label: 'Copiar', role: 'copy', enabled: p.editFlags.canCopy },
      { label: 'Colar', role: 'paste', enabled: p.editFlags.canPaste },
      { label: 'Colar sem formatação', role: 'pasteAndMatchStyle', enabled: p.editFlags.canPaste },
      { label: 'Selecionar tudo', role: 'selectAll' }
    );
    sep();
  } else if (p.selectionText && p.selectionText.trim()) {
    const text = p.selectionText.trim();
    const short = text.length > 24 ? text.slice(0, 24) + '...' : text;
    const eng = SEARCH[S().searchEngine] || SEARCH.google;
    items.push(
      { label: 'Copiar', role: 'copy' },
      { label: `Pesquisar "${short}" no ${eng.name}`, click: () => createTab(win, searchUrl(text), { afterId: tab.id }) }
    );
    if (looksLikeUrl(text)) items.push({ label: `Ir para ${short}`, click: () => createTab(win, text, { afterId: tab.id }) });
    sep();
  }
  if (!p.linkURL && !p.isEditable && !(p.selectionText && p.selectionText.trim()) && p.mediaType === 'none') {
    const h = wc.navigationHistory;
    items.push(
      { label: 'Voltar', enabled: h.canGoBack(), click: () => goBack(tab) },
      { label: 'Avançar', enabled: h.canGoForward(), click: () => goForward(tab) },
      { label: 'Recarregar', click: () => wc.reload() },
      { type: 'separator' },
      { label: 'Salvar página como...', click: () => savePage(win, tab) },
      { label: 'Imprimir...', click: () => wc.print() },
      { label: 'Copiar endereço da página', click: () => copyText(displayUrl(tab.url)) },
      { label: 'Ver código-fonte', enabled: /^https?:/.test(tab.url), click: () => createTab(win, 'view-source:' + tab.url, { afterId: tab.id }) }
    );
    sep();
  }
  items.push({ label: 'Inspecionar', click: () => { wc.inspectElement(p.x, p.y); } });
  Menu.buildFromTemplate(items).popup({ window: win });
}

function tabMenu(win, id) {
  const tab = tabById(win, id);
  if (!tab) return;
  const idx = win.nq.tabs.indexOf(tab);
  const wc = tab.view && tab.view.webContents;
  Menu.buildFromTemplate([
    { label: 'Nova aba à direita', click: () => createTab(win, null, { index: idx + 1 }) },
    { type: 'separator' },
    { label: 'Recarregar', enabled: !!wc, click: () => wc.reload() },
    { label: 'Duplicar', click: () => createTab(win, displayUrl(tab.url) || NEWTAB, { index: idx + 1 }) },
    { label: tab.pinned ? 'Desafixar' : 'Fixar', click: () => togglePin(win, tab) },
    { label: tab.muted ? 'Reativar som do site' : 'Silenciar site', enabled: !!wc, click: () => toggleMute(win, tab) },
    { label: 'Suspender aba (libera memória)', enabled: !!tab.view && tab.id !== win.nq.activeId, click: () => discardTab(win, tab) },
    { type: 'separator' },
    { label: 'Fechar', click: () => closeTab(win, id) },
    { label: 'Fechar outras abas', click: () => win.nq.tabs.filter(t => t.id !== id && !t.pinned).forEach(t => closeTab(win, t.id)) },
    { label: 'Fechar abas à direita', click: () => win.nq.tabs.slice(idx + 1).filter(t => !t.pinned).forEach(t => closeTab(win, t.id)) },
    { type: 'separator' },
    { label: 'Reabrir aba fechada', enabled: win.nq.closed.length > 0, click: () => reopenClosed(win) }
  ]).popup({ window: win });
}

function togglePin(win, tab) {
  tab.pinned = !tab.pinned;
  const nq = win.nq;
  nq.tabs.splice(nq.tabs.indexOf(tab), 1);
  // fixadas ficam sempre no comeco da barra
  nq.tabs.splice(nq.tabs.filter(t => t.pinned).length, 0, tab);
  sendState(win);
  scheduleSessionSave();
}

function toggleMute(win, tab) {
  if (!tab.view) return;
  tab.muted = !tab.muted;
  tab.view.webContents.setAudioMuted(tab.muted);
  sendState(win);
}

function bookmarkMenu(win, id) {
  const b = store.bookmarks.data.find(x => x.id === id);
  if (!b) return;
  Menu.buildFromTemplate([
    { label: 'Abrir', click: () => navigate(win, b.url) },
    { label: 'Abrir em nova aba', click: () => createTab(win, b.url, { active: false }) },
    { label: 'Abrir em janela anônima', click: () => createWindow({ isPrivate: true, urls: [b.url] }) },
    { label: 'Copiar endereço', click: () => copyText(b.url) },
    { type: 'separator' },
    { label: 'Editar no gerenciador', click: () => openInternal(win, 'bookmarks') },
    { label: 'Remover', click: () => removeBookmark(id) }
  ]).popup({ window: win });
}

function bookmarksOverflow(win, ids, x, y) {
  const items = ids.map(id => store.bookmarks.data.find(b => b.id === id)).filter(Boolean)
    .map(b => ({ label: b.title.slice(0, 60), click: () => navigate(win, b.url) }));
  if (items.length) Menu.buildFromTemplate(items).popup({ window: win, x: Math.round(x), y: Math.round(y) });
}

function openInternal(win, page, hash = '') {
  const url = `nanquim://${page}/${hash ? '#' + hash : ''}`;
  const existing = win.nq.tabs.find(t => t.url.startsWith(`nanquim://${page}`));
  if (existing) {
    activateTab(win, existing.id);
    if (hash && existing.view) existing.view.webContents.loadURL(url);
    return;
  }
  const tab = activeTab(win);
  if (tab && tab.url === NEWTAB) navigate(win, url, tab);
  else createTab(win, url);
}

async function savePage(win, tab) {
  if (!tab.view) return;
  const safe = (tab.title || 'pagina').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80).trim() || 'pagina';
  const r = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('downloads'), safe + '.html'),
    filters: [{ name: 'Página completa', extensions: ['html'] }]
  });
  if (!r.canceled && r.filePath) tab.view.webContents.savePage(r.filePath, 'HTMLComplete').catch(() => {});
}

// ---------- busca na pagina ----------

function find(win, text, opts = {}) {
  const tab = activeTab(win);
  if (!tab || !tab.view) return;
  const wc = tab.view.webContents;
  if (!text) { wc.stopFindInPage('clearSelection'); win.webContents.send('find', { active: 0, total: 0 }); return; }
  wc.findInPage(text, { forward: opts.forward !== false, findNext: !!opts.newSearch, matchCase: false });
}

function openFind(win) {
  win.nq.findOpen = true;
  sendState(win);
  win.webContents.focus();
  win.webContents.send('command', { cmd: 'focusFind' });
}

function closeFind(win) {
  win.nq.findOpen = false;
  const tab = activeTab(win);
  if (tab && tab.view) {
    tab.view.webContents.stopFindInPage('clearSelection');
    tab.view.webContents.focus();
  }
  sendState(win);
}

// ---------- paineis laterais (WhatsApp, Discord...) ----------

function togglePanel(win, id) {
  const nq = win.nq;
  if (nq.panelOpen === id) return closePanel(win);
  const p = S().panels.find(x => x.id === id);
  if (!p) return;
  if (nq.panelOpen) {
    const old = nq.panelViews.get(nq.panelOpen);
    if (old) { try { win.contentView.removeChildView(old); } catch { /* ignorado */ } }
  }
  let view = nq.panelViews.get(id);
  if (!view) {
    view = new WebContentsView({ webPreferences: { session: session.defaultSession, preload: PRELOAD_INTERNAL, contextIsolation: true, sandbox: true, spellcheck: true } });
    view.setBackgroundColor('#ffffff');
    try { view.setBorderRadius(PAGE_RADIUS); } catch { /* versoes antigas */ }
    const wc = view.webContents;
    watchUserAgent(wc);
    nq.panelState.delete(id);
    const st = panelSt(win, id);
    plog(st, 'abrindo ' + p.url);
    wirePanel(win, id, view);
    wc.on('page-favicon-updated', (e, favicons) => {
      const p = S().panels.find(x => x.id === id);
      if (p && !p.icon && favicons && favicons[0]) fetchIcon(favicons[0]).then(data => { if (data) { p.icon = data; store.settings.save(); broadcastState(); } });
    });
    wc.setWindowOpenHandler(({ url }) => { createTab(win, url); return { action: 'deny' }; });
    wc.on('before-input-event', (e, input) => { if (handleKey(win, input, false)) e.preventDefault(); });
    wc.on('context-menu', (e, params) => {
      const items = [];
      if (params.linkURL) items.push({ label: 'Abrir link em nova aba', click: () => createTab(win, params.linkURL) }, { label: 'Copiar endereço do link', click: () => copyText(params.linkURL) }, { type: 'separator' });
      if (params.isEditable) items.push({ label: 'Recortar', role: 'cut' }, { label: 'Copiar', role: 'copy' }, { label: 'Colar', role: 'paste' }, { type: 'separator' });
      else if (params.selectionText) items.push({ label: 'Copiar', role: 'copy' }, { type: 'separator' });
      items.push({ label: 'Recarregar painel', click: () => wc.reload() }, { label: 'Inspecionar', click: () => wc.inspectElement(params.x, params.y) });
      Menu.buildFromTemplate(items).popup({ window: win });
    });
    wc.loadURL(p.url).catch(() => { /* o erro aparece na capa pelo did-fail-load */ });
    nq.panelViews.set(id, view);
    watchPanel(win, id);
  }
  win.contentView.addChildView(view);
  nq.panelOpen = id;
  stackPanel(win);
  pushCover(win);
  animatePanel(win);
  sendState(win);
  view.webContents.focus();
}

// ordem das camadas: pagina, painel, capa do painel, alca de arrastar
function stackPanel(win) {
  const nq = win.nq;
  const v = nq.panelOpen && nq.panelViews.get(nq.panelOpen);
  if (!v) return;
  win.contentView.addChildView(v);
  if (nq.cover && !nq.cover.webContents.isDestroyed()) win.contentView.addChildView(nq.cover);
  if (nq.grip && !nq.grip.webContents.isDestroyed()) win.contentView.addChildView(nq.grip);
}

// ---------- carregamento do painel: capa, erros e recuperacao ----------
// Enquanto o site do painel nao mostra nada, uma capa com o icone fica por cima.
// Se der erro, a capa explica o motivo e oferece tentar de novo. Se a pagina vier em branco,
// o cache do site e limpo e ela recarrega uma vez sozinha (os logins ficam).

function panelSt(win, id) {
  let st = win.nq.panelState.get(id);
  if (!st) {
    st = { status: 'loading', t0: Date.now(), loadT: Date.now(), log: [], errs: [], healed: false, healing: false, crashes: 0, idleSince: null, whiteSince: null, nudged: false, looping: false };
    win.nq.panelState.set(id, st);
  }
  return st;
}

function plog(st, msg) {
  st.log.push(`+${((Date.now() - st.t0) / 1000).toFixed(1)}s ${String(msg).slice(0, 220)}`);
  if (st.log.length > 70) st.log.splice(0, st.log.length - 70);
}

function setPanelStatus(win, id, status, extra = {}) {
  if (win.isDestroyed()) return;
  const st = panelSt(win, id);
  Object.assign(st, extra);
  if (st.status !== status) {
    st.status = status;
    plog(st, 'estado: ' + status + (st.code ? ` (${st.desc || ''} ${st.code})` : ''));
  }
  if (status === 'loading' || status === 'slow') watchPanel(win, id);
  if (win.nq.panelOpen === id) { pushCover(win); applyLayout(win); }
}

// recomeca a carregar o painel do zero (botao da capa, menu, atalho)
function restartPanel(win, id, how = 'reload') {
  const view = win.nq.panelViews.get(id);
  const p = S().panels.find(x => x.id === id);
  if (!view || view.webContents.isDestroyed()) return;
  const st = panelSt(win, id);
  const wc = view.webContents;
  const url = wc.getURL();
  Object.assign(st, { loadT: Date.now(), idleSince: null, whiteSince: null, nudged: false, healing: false, code: null, desc: null, crashes: 0 });
  if (how === 'manual') st.healed = false;
  plog(st, 'recarregando (' + how + ')');
  setPanelStatus(win, id, 'loading');
  if (how === 'home' || !/^https?:/.test(url) || st.lastFail) {
    st.lastFail = null;
    wc.loadURL(how === 'home' || !/^https?:/.test(url) ? p.url : url).catch(() => {});
  } else wc.reloadIgnoringCache();
}

function wirePanel(win, id, view) {
  const wc = view.webContents;
  const st = () => win.nq.panelState.get(id);
  const log = (m) => { const s = st(); if (s) plog(s, m); };
  wc.on('did-start-navigation', (e) => {
    if (!e.isMainFrame || e.isSameDocument || /^chrome-error:/.test(e.url)) return;
    log('navegando ' + e.url);
    const s = st();
    // o site saiu de um erro sozinho (ou a pessoa clicou em algo): volta a acompanhar
    if (s && ['error', 'blank', 'crash'].includes(s.status)) {
      Object.assign(s, { loadT: Date.now(), idleSince: null, whiteSince: null, nudged: false, code: null, desc: null });
      setPanelStatus(win, id, 'loading');
    }
  });
  wc.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    log(`falhou ${desc} ${code} ${isMainFrame ? 'pagina' : 'quadro'} ${url}`);
    if (!isMainFrame || code === -3) return;
    const s = st();
    if (s) s.lastFail = url;
    setPanelStatus(win, id, 'error', { code, desc });
  });
  wc.on('dom-ready', () => log('dom pronto'));
  wc.on('did-finish-load', () => log('terminou de carregar'));
  wc.on('did-stop-loading', () => log('parou de carregar'));
  wc.on('unresponsive', () => log('parou de responder'));
  wc.on('responsive', () => log('voltou a responder'));
  wc.on('render-process-gone', (e, d) => {
    log(`processo encerrou: ${d.reason} (${d.exitCode})`);
    if (d.reason === 'clean-exit') return;
    const s = st();
    if (s && s.crashes < 1) {
      s.crashes++;
      setTimeout(() => { if (!wc.isDestroyed()) { Object.assign(s, { loadT: Date.now(), idleSince: null, whiteSince: null }); setPanelStatus(win, id, 'loading'); wc.reload(); } }, 600);
    } else setPanelStatus(win, id, 'crash', { desc: d.reason });
  });
  wc.on('console-message', (e, ...rest) => {
    // Electron novo manda um objeto com level/message; o antigo mandava argumentos soltos
    const level = e && e.level !== undefined ? e.level : rest[0];
    const message = e && e.message !== undefined ? e.message : rest[1];
    if (level !== 'error' && level !== 3) return;
    const s = st();
    if (!s) return;
    s.errs.push(`+${((Date.now() - s.t0) / 1000).toFixed(1)}s ${String(message).slice(0, 200)}`);
    if (s.errs.length > 10) s.errs.shift();
  });
}

const PANEL_PROBE = `(() => {
  try {
    const b = document.body;
    if (!b) return 0;
    if ((b.innerText || '').trim().length) return 2;
    for (const el of b.querySelectorAll('img,svg,canvas,video,iframe,input,button,progress,picture')) {
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) return 1;
    }
    return 0;
  } catch (e) { return 0; }
})()`;

function withTimeout(p, ms) {
  return Promise.race([Promise.resolve(p).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
}

// true: a imagem do painel e toda branca; false: tem algo desenhado; null: nao deu para capturar
async function panelLooksWhite(view) {
  const img = await withTimeout(view.webContents.capturePage(), 2000);
  if (!img || img.isEmpty()) return null;
  const bmp = img.resize({ width: 48 }).toBitmap();
  for (let i = 0; i < bmp.length; i += 4) {
    if (bmp[i] < 246 || bmp[i + 1] < 246 || bmp[i + 2] < 246) return false;
  }
  return true;
}

function watchPanel(win, id) {
  const st = panelSt(win, id);
  if (st.looping) return;
  st.looping = true;
  const tick = async () => {
    const view = !win.isDestroyed() && win.nq.panelViews.get(id);
    if (!view || view.webContents.isDestroyed() || win.nq.panelState.get(id) !== st || !['loading', 'slow'].includes(st.status)) {
      st.looping = false;
      return;
    }
    const wc = view.webContents;
    const now = Date.now();
    let found = 0;
    if (/^https?:/.test(wc.getURL())) found = (await withTimeout(wc.executeJavaScriptInIsolatedWorld(1999, [{ code: PANEL_PROBE }]), 1500)) || 0;
    if (found > 0) {
      const shown = win.nq.panelOpen === id && !win.nq.panelHidden && !win.nq.frozen && win.nq.htmlFull == null;
      const white = shown ? await panelLooksWhite(view) : null;
      if (white !== true) {
        st.looping = false;
        st.healing = false;
        plog(st, 'conteudo apareceu' + (white === null ? ' (sem captura)' : ''));
        setPanelStatus(win, id, 'ready');
        return;
      }
      // a pagina tem conteudo mas a imagem continua branca: forca o painel a se redesenhar
      if (!st.whiteSince) st.whiteSince = now;
      if (!st.nudged && now - st.whiteSince > 1500) {
        st.nudged = true;
        plog(st, 'pagina com conteudo mas desenho branco: redesenhando');
        try { wc.invalidate(); } catch { /* ignorado */ }
        if (win.nq.panelOpen === id) {
          const b = view.getBounds();
          view.setBounds({ ...b, width: Math.max(1, b.width - 1) });
          setTimeout(() => { if (!win.isDestroyed()) applyLayout(win); }, 60);
        }
      }
      if (now - st.whiteSince > 7000) return panelBlank(win, id, 'desenho branco');
    } else st.whiteSince = null;
    if (!wc.isLoading()) {
      if (!st.idleSince) st.idleSince = now;
      if (now - st.idleSince > 6000 && !found) return panelBlank(win, id, 'pagina vazia');
    } else st.idleSince = null;
    if (st.status === 'loading' && now - st.loadT > 20000) setPanelStatus(win, id, 'slow');
    setTimeout(tick, 400);
  };
  setTimeout(tick, 250);
}

async function panelBlank(win, id, why) {
  const st = panelSt(win, id);
  st.looping = false;
  const view = win.nq.panelViews.get(id);
  if (!view || view.webContents.isDestroyed()) return;
  const wc = view.webContents;
  plog(st, 'em branco: ' + why);
  if (!st.healed) {
    // primeira vez: limpa o cache e o service worker do site (logins ficam) e recarrega
    st.healed = true;
    let origin = '';
    try { origin = new URL(wc.getURL() || (S().panels.find(x => x.id === id) || {}).url).origin; } catch { /* sem origem */ }
    if (origin) {
      plog(st, 'limpando cache de ' + origin);
      await withTimeout(wc.session.clearStorageData({ origin, storages: ['serviceworkers', 'cachestorage'] }), 4000);
    }
    Object.assign(st, { healing: true, loadT: Date.now(), idleSince: null, whiteSince: null, nudged: false });
    setPanelStatus(win, id, 'loading');
    wc.reloadIgnoringCache();
    return;
  }
  setPanelStatus(win, id, 'blank', { desc: why });
}

function panelDetails(win, id) {
  const st = win.nq.panelState.get(id);
  const p = S().panels.find(x => x.id === id) || {};
  const view = win.nq.panelViews.get(id);
  const os = require('os');
  const lines = [
    `Nanquim ${app.getVersion()} · Electron ${process.versions.electron} · Chrome ${process.versions.chrome} · ${process.platform} ${os.release()}`,
    `Painel: ${p.name || id} (${p.url || '?'})`,
    `Endereço agora: ${view && !view.webContents.isDestroyed() ? view.webContents.getURL() || '(vazio)' : '(fechado)'}`,
    `Estado: ${st ? st.status : '?'}${st && st.code ? ` ${st.desc || ''} ${st.code}` : ''}${st && st.desc && !st.code ? ` ${st.desc}` : ''}`,
    `Bloqueador: ${S().adblock ? 'ligado' : 'desligado'}`,
    '',
    'Linha do tempo:',
    ...(st ? st.log : []).map(l => '  ' + l)
  ];
  if (st && st.errs.length) lines.push('', 'Erros da página:', ...st.errs.map(l => '  ' + l));
  return lines.join('\n');
}

function ensureCover(win) {
  const nq = win.nq;
  if (nq.cover && !nq.cover.webContents.isDestroyed()) return nq.cover;
  const v = new WebContentsView({ webPreferences: { preload: PRELOAD_COVER, contextIsolation: true, sandbox: true } });
  v.setBackgroundColor(themeOf().cover);
  try { v.setBorderRadius(PAGE_RADIUS + 1); } catch { /* versoes antigas */ }
  v.setVisible(false);
  v.webContents.loadFile(COVER_HTML);
  v.webContents.on('did-finish-load', () => pushCover(win));
  nq.cover = v;
  win.contentView.addChildView(v);
  stackPanel(win);
  return v;
}

function pushCover(win, extra = {}) {
  const nq = win.nq;
  if (!nq.cover || nq.cover.webContents.isDestroyed() || !nq.panelOpen) return;
  const id = nq.panelOpen;
  const p = S().panels.find(x => x.id === id);
  const st = nq.panelState.get(id);
  if (!p || !st) return;
  let host = '';
  try { host = new URL(p.url).hostname.replace(/^www\./, ''); } catch { /* sem host */ }
  nq.cover.webContents.send('cover:data', {
    theme: S().theme, accent: S().accent, name: p.name, icon: panelIconOf(p), host,
    status: st.status, code: st.code || null, desc: st.desc || null, healing: !!st.healing, ...extra
  });
}

ipcMain.on('cover:act', (e, act) => {
  const win = allWindows().find(w => w.nq.cover && w.nq.cover.webContents === e.sender);
  if (!win || !win.nq.panelOpen) return;
  const id = win.nq.panelOpen;
  const view = win.nq.panelViews.get(id);
  const p = S().panels.find(x => x.id === id);
  if (act === 'retry') restartPanel(win, id, 'manual');
  else if (act === 'tab') {
    const url = view && !view.webContents.isDestroyed() && /^https?:/.test(view.webContents.getURL()) ? view.webContents.getURL() : (p && p.url);
    closePanel(win);
    if (url) createTab(win, url);
  } else if (act === 'show') {
    plog(panelSt(win, id), 'mostrar assim mesmo');
    setPanelStatus(win, id, 'ready');
  } else if (act === 'copy') {
    copyText(panelDetails(win, id));
    pushCover(win, { copied: true });
  }
});

// o painel abre crescendo a partir da barra lateral
function animatePanel(win) {
  const nq = win.nq;
  nq.panelAnim = Date.now();
  const tick = () => {
    if (win.isDestroyed() || !nq.panelAnim) return;
    applyLayout(win);
    if (Date.now() - nq.panelAnim < 280) setTimeout(tick, 16);
    else { nq.panelAnim = null; applyLayout(win); }
  };
  tick();
}

// o painel fica por cima da pagina; quando a pagina e trocada, ele volta para a frente
function raisePanel(win) {
  stackPanel(win);
}

function panelMenu(win, id) {
  const p = S().panels.find(x => x.id === id);
  if (!p) return;
  const view = win.nq.panelViews.get(id);
  Menu.buildFromTemplate([
    { label: win.nq.panelOpen === id ? 'Fechar painel' : 'Abrir painel', click: () => togglePanel(win, id) },
    { label: 'Recarregar', enabled: !!view, click: () => restartPanel(win, id, 'manual') },
    { label: 'Voltar ao início', enabled: !!view, click: () => restartPanel(win, id, 'home') },
    { label: 'Abrir em uma aba', click: () => createTab(win, view && /^https?:/.test(view.webContents.getURL()) ? view.webContents.getURL() : p.url) },
    { label: 'Copiar detalhes do painel', enabled: !!view, click: () => copyText(panelDetails(win, id)) },
    { type: 'separator' },
    { label: 'Manter aberto ao clicar fora', type: 'checkbox', checked: !!S().panelPinned, click: (it) => { S().panelPinned = it.checked; store.settings.save(); broadcastSettings(); } },
    { type: 'separator' },
    { label: 'Fechar e liberar memória', enabled: !!view, click: () => destroyPanel(win, id) },
    { label: 'Gerenciar painéis', click: () => openInternal(win, 'settings', 'paineis') }
  ]).popup({ window: win });
}

function closePanel(win) {
  const nq = win.nq;
  const view = nq.panelViews.get(nq.panelOpen);
  if (view) { try { win.contentView.removeChildView(view); } catch { /* ignorado */ } }
  nq.panelOpen = null;
  nq.gripDrag = null;
  nq.panelLiveW = null;
  if (nq.grip) nq.grip.setVisible(false);
  if (nq.cover) nq.cover.setVisible(false);
  sendState(win);
  const tab = activeTab(win);
  if (tab && tab.view) tab.view.webContents.focus();
}

function destroyPanel(win, id) {
  const view = win.nq.panelViews.get(id);
  if (!view) return;
  if (win.nq.panelOpen === id) closePanel(win);
  try { view.webContents.close(); } catch { /* ignorado */ }
  win.nq.panelViews.delete(id);
  win.nq.panelBadges.delete(id);
  win.nq.panelState.delete(id);
  sendState(win);
}

// ---------- layout ----------

function applyLayout(win) {
  if (win.isDestroyed()) return;
  const nq = win.nq;
  const [W, H] = win.getContentSize();
  const tab = activeTab(win);
  if (tab && tab.view) {
    if (nq.htmlFull === tab.id) tab.view.setBounds({ x: 0, y: 0, width: W, height: H });
    else if (nq.insets) {
      const i = nq.insets.view;
      tab.view.setBounds({
        x: i.left, y: i.top,
        width: Math.max(0, W - i.left - i.right),
        height: Math.max(0, H - i.top - i.bottom)
      });
    }
    tab.view.setVisible(!nq.frozen);
  }
  if (nq.panelOpen) {
    const view = nq.panelViews.get(nq.panelOpen);
    const i = nq.insets && nq.insets.view;
    if (view && i && nq.htmlFull == null && !nq.panelHidden) {
      const vw = W - i.left - i.right, vh = H - i.top - i.bottom;
      const full = Math.min(nq.panelLiveW || S().panelWidth || 420, panelMaxWidth(win));
      let w = full;
      if (nq.panelAnim) {
        const t = Math.min(1, (Date.now() - nq.panelAnim) / 280);
        w = Math.round(full * (0.5 + 0.5 * (1 - Math.pow(1 - t, 3))));
      }
      const b = { x: i.left + 8, y: i.top + 8, width: w, height: Math.max(0, vh - 16) };
      view.setBounds(b);
      view.setVisible(true);
      // capa por cima do painel enquanto ele nao mostrou nada (ou deu erro)
      const st = nq.panelState.get(nq.panelOpen);
      if (st && st.status !== 'ready') {
        const cover = ensureCover(win);
        // 1px maior em volta para esconder a borda branca do painel embaixo
        cover.setBounds({ x: b.x - 1, y: b.y - 1, width: b.width + 2, height: b.height + 2 });
        cover.setVisible(true);
      } else if (nq.cover) nq.cover.setVisible(false);
      // alca de arrastar na borda direita (durante o arraste ela cobre a janela toda, transparente)
      const grip = ensureGrip(win);
      if (nq.gripDrag) grip.setBounds({ x: 0, y: 0, width: W, height: H });
      else grip.setBounds({ x: b.x + b.width - GRIP_W / 2, y: b.y, width: GRIP_W, height: b.height });
      grip.setVisible(!nq.panelAnim);
      return;
    } else if (view) view.setVisible(false);
  }
  if (nq.grip) nq.grip.setVisible(false);
  if (nq.cover) nq.cover.setVisible(false);
}

// o painel pode crescer ate ocupar a area da pagina inteira (sobra so a margem)
function panelMaxWidth(win) {
  const i = win.nq.insets && win.nq.insets.view;
  const [W] = win.getContentSize();
  const vw = i ? W - i.left - i.right : W;
  return Math.max(PANEL_MIN, vw - 16);
}

function ensureGrip(win) {
  const nq = win.nq;
  if (nq.grip && !nq.grip.webContents.isDestroyed()) return nq.grip;
  const v = new WebContentsView({ webPreferences: { preload: PRELOAD_GRIP, contextIsolation: true, sandbox: true } });
  v.setBackgroundColor('#00000000');
  v.webContents.loadFile(GRIP_HTML);
  v.webContents.on('did-finish-load', () => v.webContents.send('grip:accent', S().accent));
  nq.grip = v;
  win.contentView.addChildView(v);
  return v;
}

function gripWin(sender) { return allWindows().find(w => w.nq.grip && w.nq.grip.webContents === sender); }

ipcMain.on('grip:start', (e, sx) => {
  const win = gripWin(e.sender);
  if (!win) return;
  const pv = win.nq.panelOpen && win.nq.panelViews.get(win.nq.panelOpen);
  if (!pv) return;
  win.nq.gripDrag = { sx: Number(sx) || 0, w0: pv.getBounds().width };
  applyLayout(win);
});
ipcMain.on('grip:move', (e, sx) => {
  const win = gripWin(e.sender);
  if (!win || !win.nq.gripDrag) return;
  const d = win.nq.gripDrag;
  win.nq.panelLiveW = Math.round(Math.max(PANEL_MIN, Math.min(panelMaxWidth(win), d.w0 + (Number(sx) || 0) - d.sx)));
  applyLayout(win);
});
ipcMain.on('grip:end', (e) => {
  const win = gripWin(e.sender);
  if (!win || !win.nq.gripDrag) return;
  if (win.nq.panelLiveW) { S().panelWidth = win.nq.panelLiveW; store.settings.save(); }
  win.nq.gripDrag = null;
  win.nq.panelLiveW = null;
  allWindows().forEach(applyLayout);
  broadcastSettings();
});
ipcMain.on('grip:reset', (e) => {
  const win = gripWin(e.sender);
  if (!win) return;
  S().panelWidth = 420;
  store.settings.save();
  allWindows().forEach(applyLayout);
  broadcastSettings();
});

// ---------- atalhos de teclado ----------

function handleKey(win, input, fromUI) {
  if (input.type !== 'keyDown') return false;
  // durante o print, os atalhos ficam com o editor (Ctrl+C, Ctrl+S, Ctrl+Z, Esc)
  if (fromUI && win.nq.snapping) return false;
  const ctrl = input.control || input.meta;
  const shift = input.shift;
  const alt = input.alt;
  const key = (input.key || '').toLowerCase();
  const code = input.code || '';
  const tab = activeTab(win);
  const wc = tab && tab.view && tab.view.webContents;
  const nq = win.nq;
  const act = (fn) => { fn(); return true; };

  if (key === 'escape' && nq.findOpen) return act(() => closeFind(win));
  // Ctrl+Shift+L: bloquear agora (pede a senha para voltar)
  if (ctrl && shift && !alt && key === 'l') return act(() => { if (!lockNow()) openInternal(win, 'settings', 'privacidade'); });
  if (key === 'f5' || (ctrl && key === 'r')) return act(() => wc && ((shift || ctrl && key === 'f5') ? wc.reloadIgnoringCache() : wc.reload()));
  if (key === 'f6' || (ctrl && key === 'l') || (alt && key === 'd') || (ctrl && key === 'e')) return act(() => { win.webContents.focus(); win.webContents.send('command', { cmd: 'focusAddress' }); });
  if (key === 'f11') return act(() => win.setFullScreen(!win.isFullScreen()));
  if (key === 'f12' || (ctrl && shift && key === 'i')) return act(() => wc && wc.toggleDevTools());
  if (alt && !ctrl && key === 'arrowleft') return act(() => tab && goBack(tab));
  if (alt && !ctrl && key === 'arrowright') return act(() => tab && goForward(tab));
  if (alt && key === 'home') return act(() => navigate(win, S().homepage));
  if (!ctrl) return false;

  // Ctrl+Shift+5: tirar print (mesmo atalho do Opera)
  if (code === 'Digit5' && shift && !alt) return act(() => win.webContents.send('command', { cmd: 'snapshot' }));
  if (code.startsWith('Digit') && !shift && !alt) {
    const n = Number(code.slice(5));
    if (n >= 1 && n <= 9) {
      const t = n === 9 ? nq.tabs[nq.tabs.length - 1] : nq.tabs[n - 1];
      return act(() => t && activateTab(win, t.id));
    }
  }
  if (key === 'tab' || key === 'pagedown' || key === 'pageup') {
    const back = key === 'pageup' || (key === 'tab' && shift);
    const i = nq.tabs.findIndex(t => t.id === nq.activeId);
    const next = nq.tabs[(i + (back ? -1 : 1) + nq.tabs.length) % nq.tabs.length];
    return act(() => next && activateTab(win, next.id));
  }
  if (shift) {
    switch (key) {
      case 't': return act(() => reopenClosed(win));
      case 'n': return act(() => createWindow({ isPrivate: true }));
      case 'b': return act(() => { S().bookmarksBar = !S().bookmarksBar; store.settings.save(); broadcastSettings(); });
      case 's': return act(() => { S().sidebar = !S().sidebar; store.settings.save(); broadcastSettings(); });
      case 'delete': return act(() => openInternal(win, 'settings', 'privacidade'));
      case 'o': return act(() => openInternal(win, 'bookmarks'));
    }
    return false;
  }
  switch (key) {
    case 't': return act(() => createTab(win));
    case 'w': return act(() => tab && closeTab(win, tab.id));
    case 'n': return act(() => createWindow());
    case 'f': return act(() => openFind(win));
    case 'g': return act(() => win.webContents.send('command', { cmd: 'findNext' }));
    case 'd': return act(() => toggleBookmarkActive(win));
    case 'h': return act(() => openInternal(win, 'history'));
    case 'j': return act(() => openInternal(win, 'downloads'));
    case 'p': return act(() => wc && wc.print());
    case 's': return act(() => tab && savePage(win, tab));
    case 'u': return act(() => tab && /^https?:/.test(tab.url) && createTab(win, 'view-source:' + tab.url, { afterId: tab.id }));
    case ',': return act(() => openInternal(win, 'settings'));
    case '+': case '=': return act(() => { setZoom(tab, 1); sendState(win); });
    case '-': return act(() => { setZoom(tab, -1); sendState(win); });
    case '0': return act(() => { setZoom(tab, 0); sendState(win); });
  }
  if (code === 'NumpadAdd') return act(() => { setZoom(tab, 1); sendState(win); });
  if (code === 'NumpadSubtract') return act(() => { setZoom(tab, -1); sendState(win); });
  return false;
}

function toggleBookmarkActive(win) {
  const tab = activeTab(win);
  if (!tab) return;
  const url = displayUrl(tab.url);
  if (!url || url.startsWith('nanquim://')) return;
  const b = findBookmark(url);
  if (b) removeBookmark(b.id);
  else addBookmark(url, tab.title, tab.favicon);
}

// ---------- janelas ----------

function createWindow(opts = {}) {
  const isPrivate = !!opts.isPrivate;
  const t = themeOf();
  const saved = S().windowBounds;
  const bounds = opts.bounds || (saved && !isPrivate ? saved : null);
  const win = new BrowserWindow({
    width: bounds ? bounds.width : 1360,
    height: bounds ? bounds.height : 860,
    x: bounds && windows.size === 0 ? bounds.x : undefined,
    y: bounds && windows.size === 0 ? bounds.y : undefined,
    minWidth: 560,
    minHeight: 400,
    show: false,
    title: isPrivate ? 'Nanquim (anônima)' : 'Nanquim',
    icon: ICON,
    backgroundColor: t.page,
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? undefined : { color: t.bar, symbolColor: t.fg, height: 46 },
    trafficLightPosition: { x: 14, y: 16 },
    webPreferences: { preload: PRELOAD_UI, contextIsolation: true, sandbox: true, spellcheck: false }
  });
  win.setMenu(null);
  const ses = isPrivate ? session.fromPartition('nq-anonima-' + Date.now()) : session.defaultSession;
  prepareSession(ses, isPrivate);
  win.nq = {
    id: ++winSeq, isPrivate, session: ses, tabs: [], activeId: null, insets: null, closed: [],
    panelViews: new Map(), panelBadges: new Map(), panelState: new Map(), panelOpen: null, frozen: false, findOpen: false, htmlFull: null, stateQueued: false
  };
  windows.add(win);
  if (bounds && bounds.maximized && !isPrivate) win.maximize();

  win.loadFile(UI_HTML);
  win.once('ready-to-show', () => win.show());

  win.webContents.on('before-input-event', (e, input) => { if (handleKey(win, input, true)) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.on('resize', () => { applyLayout(win); rememberBounds(win); });
  win.on('move', () => rememberBounds(win));
  win.on('enter-full-screen', () => win.webContents.send('command', { cmd: 'fullscreen', on: true }));
  win.on('leave-full-screen', () => win.webContents.send('command', { cmd: 'fullscreen', on: false }));
  win.on('app-command', (e, cmd) => {
    const tab = activeTab(win);
    if (!tab) return;
    if (cmd === 'browser-backward') goBack(tab);
    if (cmd === 'browser-forward') goForward(tab);
  });
  win.on('focus', () => { lastFocused = win; });

  win.on('close', () => {
    const normals = allWindows().filter(w => !w.nq.isPrivate);
    if (!isPrivate && normals.length === 1 && normals[0] === win) {
      saveSession(true);
      sessionLocked = true;
    }
  });
  win.on('closed', () => {
    for (const tab of win.nq.tabs) { try { tab.view && tab.view.webContents.close(); } catch { /* ignorado */ } }
    for (const v of win.nq.panelViews.values()) { try { v.webContents.close(); } catch { /* ignorado */ } }
    if (win.nq.grip) { try { win.nq.grip.webContents.close(); } catch { /* ignorado */ } }
    if (win.nq.cover) { try { win.nq.cover.webContents.close(); } catch { /* ignorado */ } }
    windows.delete(win);
    if (!sessionLocked) scheduleSessionSave();
  });

  // abas iniciais
  const urls = opts.urls && opts.urls.length ? opts.urls : [null];
  const restored = opts.restoredTabs;
  if (restored && restored.length) {
    const active = Math.min(opts.activeIndex || 0, restored.length - 1);
    restored.forEach((t, i) => createTab(win, t.url, { lazy: i !== active, active: false, title: t.title, pinned: t.pinned }));
    activateTab(win, win.nq.tabs[active].id);
  } else {
    urls.forEach((u, i) => createTab(win, u || (S().homepage === NEWTAB ? null : S().homepage), { active: i === 0 }));
  }
  return win;
}

let lastFocused = null;
let boundsTimer = null;
function rememberBounds(win) {
  if (win.nq.isPrivate || win.isFullScreen()) return;
  clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (win.isDestroyed()) return;
    const max = win.isMaximized();
    const b = max ? (S().windowBounds || win.getNormalBounds()) : win.getBounds();
    S().windowBounds = { ...b, maximized: max };
    store.settings.save();
  }, 500);
}

function focusedWindow() {
  const f = BrowserWindow.getFocusedWindow();
  if (f && f.nq) return f;
  if (lastFocused && !lastFocused.isDestroyed()) return lastFocused;
  return allWindows()[0] || null;
}

// ---------- sessao (restaurar abas) ----------

let sessionTimer = null;
function scheduleSessionSave() {
  if (sessionLocked) return;
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => saveSession(false), 800);
}

function saveSession(now) {
  if (sessionLocked || !browserOpen) return;
  store.session.data = {
    windows: allWindows().filter(w => !w.nq.isPrivate).map(w => ({
      active: Math.max(0, w.nq.tabs.findIndex(t => t.id === w.nq.activeId)),
      tabs: w.nq.tabs
        .filter(t => t.url && !t.url.startsWith('nanquim://erro'))
        .map(t => ({ url: t.url, title: t.title, pinned: t.pinned }))
    })).filter(w => w.tabs.length)
  };
  store.session.save(now);
}

function copyText(t) { try { const r = clipboard.writeText(String(t)); if (r && r.catch) r.catch(() => {}); } catch { /* ignorado */ } }

// ---------- print (captura de tela da pagina) ----------

async function snapStart(win) {
  const nq = win.nq;
  const tab = activeTab(win);
  if (!tab || !tab.view) return null;
  const rect = tab.view.getBounds();
  let data = null;
  try {
    const img = await tab.view.webContents.capturePage();
    if (!img.isEmpty()) data = img.toDataURL();
  } catch { /* sem captura */ }
  // esconde a pagina e o painel; a interface mostra a imagem congelada por cima
  nq.frozen = true;
  nq.panelHidden = true;
  nq.snapping = true;
  tab.view.setVisible(false);
  const pv = nq.panelOpen && nq.panelViews.get(nq.panelOpen);
  if (pv) pv.setVisible(false);
  if (nq.grip) nq.grip.setVisible(false);
  if (nq.cover) nq.cover.setVisible(false);
  return data ? { data, rect, title: tab.title, url: displayUrl(tab.url) } : null;
}

// pagina inteira: pede ao motor uma imagem alem da parte visivel
async function snapFull(win) {
  const tab = activeTab(win);
  if (!tab || !tab.view) return null;
  const wc = tab.view.webContents;
  const dbg = wc.debugger;
  let attached = false;
  try {
    if (!dbg.isAttached()) { dbg.attach('1.3'); attached = true; }
    const m = await dbg.sendCommand('Page.getLayoutMetrics');
    const size = m.cssContentSize || m.contentSize;
    const width = Math.ceil(size.width);
    const height = Math.min(Math.ceil(size.height), 16000);
    const r = await dbg.sendCommand('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true, fromSurface: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    });
    return { data: 'data:image/png;base64,' + r.data, width, height, cut: Math.ceil(size.height) > height };
  } catch (err) {
    return null;
  } finally {
    if (attached) { try { dbg.detach(); } catch { /* ignorado */ } }
  }
}

// copia a imagem para a area de transferencia (Ctrl+V cola em qualquer lugar)
async function copyImage(dataUrl) {
  const img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) return false;
  try {
    if (typeof clipboard.writeImage === 'function') clipboard.writeImage(img);
    else await clipboard.write([new ClipboardItem({ 'image/png': new Blob([img.toPNG()], { type: 'image/png' }) })]);
    return true;
  } catch (err) {
    console.warn('Nao copiou a imagem:', err.message);
    return false;
  }
}

// so salva no computador quando a pessoa pede, e ela escolhe onde
async function snapSave(win, dataUrl) {
  const img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) return null;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `Print ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.png`;
  const r = await dialog.showSaveDialog(win, {
    title: 'Salvar print no computador',
    defaultPath: path.join(app.getPath('pictures'), name),
    filters: [{ name: 'Imagem PNG', extensions: ['png'] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, img.toPNG());
  return r.filePath;
}

// ---------- icones dos paineis (o icone oficial de cada site) ----------

async function fetchIcon(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await net.fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || 'image/png').split(';')[0];
    if (!/^image\//.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80 || buf.length > 300000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

async function ensurePanelIcons() {
  let changed = false;
  for (const p of S().panels) {
    if (p.icon || PANEL_BRAND[p.id]) continue;
    let host = '';
    try { host = new URL(p.url).hostname; } catch { continue; }
    const brand = HOST_BRAND[host.replace(/^www\./, '')];
    const data = (brand && BRAND[brand]) ||
      await fetchIcon(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`) ||
      await fetchIcon(`https://${host}/favicon.ico`);
    if (data) { p.icon = data; changed = true; }
  }
  if (changed) { store.settings.save(); broadcastState(); }
}

// ---------- atualizacao automatica ----------
// Procura versao nova ao abrir e a cada 2 horas, baixa por tras e instala quando o navegador fecha
// (ou na hora, se a pessoa clicar em "Reiniciar"). As versoes ficam nos Releases do GitHub.
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch { /* sem atualizador no modo de desenvolvimento */ }
const updateState = { status: 'idle', version: null, progress: 0, error: null, checkedAt: null };

function pushUpdate() {
  for (const w of allWindows()) w.webContents.send('update', updateState);
  for (const wc of webContents.getAllWebContents()) {
    try { if (wc.getURL().startsWith('nanquim://settings')) wc.send('update', updateState); } catch { /* ignorado */ }
  }
}

function checkUpdates() {
  if (!autoUpdater || !app.isPackaged) {
    updateState.status = 'dev';
    pushUpdate();
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    updateState.status = 'error';
    updateState.error = String(err && err.message || err).slice(0, 160);
    pushUpdate();
  });
}

function setupUpdater() {
  if (!autoUpdater || !app.isPackaged) { updateState.status = 'dev'; return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => { updateState.status = 'checking'; pushUpdate(); });
  autoUpdater.on('update-available', (info) => { updateState.status = 'downloading'; updateState.version = info.version; updateState.progress = 0; pushUpdate(); });
  autoUpdater.on('update-not-available', () => { updateState.status = 'latest'; updateState.checkedAt = Date.now(); pushUpdate(); });
  autoUpdater.on('download-progress', (p) => { updateState.progress = Math.round(p.percent || 0); pushUpdate(); });
  autoUpdater.on('update-downloaded', (info) => { updateState.status = 'ready'; updateState.version = info.version; pushUpdate(); });
  autoUpdater.on('error', (err) => {
    // sem internet ou sem versao publicada ainda: tenta de novo mais tarde, sem incomodar
    updateState.status = 'error';
    updateState.error = String(err && err.message || err).slice(0, 160);
    pushUpdate();
  });
  setTimeout(checkUpdates, 8000);
  setInterval(checkUpdates, 2 * 3600 * 1000);
}

function installUpdate() {
  if (!autoUpdater || updateState.status !== 'ready') return;
  if (!sessionLocked) { saveSession(true); sessionLocked = true; }
  store.flushAll();
  // instala sem perguntar nada e abre o navegador de novo ja atualizado
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
}

// ---------- extensoes (experimental) ----------

async function loadExtensions() {
  const list = S().extensions || [];
  for (const dir of list) {
    try { await session.defaultSession.extensions.loadExtension(dir, { allowFileAccess: true }); }
    catch (err) { console.warn('Extensao nao carregou:', dir, err.message); }
  }
}

function extensionsInfo() {
  try {
    return session.defaultSession.extensions.getAllExtensions().map(e => ({ id: e.id, name: e.name, version: e.version, path: e.path }));
  } catch { return []; }
}

// ---------- favoritos: importar e exportar ----------

function parseBookmarksHtml(html) {
  const out = [];
  const re = /<A\s+[^>]*HREF="([^"]+)"[^>]*>([\s\S]*?)<\/A>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    if (/^https?:/.test(url)) out.push({ url, title: title || url });
  }
  return out;
}

function bookmarksToHtml(list) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const items = list.map(b => `    <DT><A HREF="${esc(b.url)}" ADD_DATE="${Math.floor((b.created || Date.now()) / 1000)}">${esc(b.title)}</A>`).join('\n');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n  <DT><H3>Nanquim</H3>\n  <DL><p>\n${items}\n  </DL><p>\n</DL><p>\n`;
}

// ---------- IPC: interface do navegador ----------

const uiActions = {
  newTab: (win, url) => createTab(win, url),
  closeTab: (win, id) => closeTab(win, id),
  activateTab: (win, id) => activateTab(win, id),
  moveTab: (win, id, index) => moveTab(win, id, index),
  tabMenu: (win, id) => tabMenu(win, id),
  muteTab: (win, id) => { const t = tabById(win, id); if (t) toggleMute(win, t); },
  navigate: (win, text) => navigate(win, text),
  openUrl: (win, url, newTab) => newTab ? createTab(win, url, { active: false }) : navigate(win, url),
  back: (win) => { const t = activeTab(win); t && goBack(t); },
  forward: (win) => { const t = activeTab(win); t && goForward(t); },
  reload: (win, hard) => { const t = activeTab(win); if (t && t.view) hard ? t.view.webContents.reloadIgnoringCache() : t.view.webContents.reload(); },
  stop: (win) => { const t = activeTab(win); t && t.view && t.view.webContents.stop(); },
  home: (win) => navigate(win, S().homepage),
  toggleBookmark: (win) => toggleBookmarkActive(win),
  bookmarkMenu: (win, id) => bookmarkMenu(win, id),
  bookmarksOverflow: (win, ids, x, y) => bookmarksOverflow(win, ids, x, y),
  openInternal: (win, page, hash) => openInternal(win, page, hash),
  find: (win, text, opts) => find(win, text, opts),
  findClose: (win) => closeFind(win),
  zoom: (win, dir) => { setZoom(activeTab(win), dir); sendState(win); },
  panelToggle: (win, id) => togglePanel(win, id),
  panelClose: (win) => closePanel(win),
  panelReload: (win) => { if (win.nq.panelOpen) restartPanel(win, win.nq.panelOpen, 'manual'); },
  panelHome: (win) => { if (win.nq.panelOpen) restartPanel(win, win.nq.panelOpen, 'home'); },
  panelToTab: (win) => { const v = win.nq.panelViews.get(win.nq.panelOpen); v && createTab(win, v.webContents.getURL()); },
  panelUnload: (win, id) => destroyPanel(win, id),
  panelMenu: (win, id) => panelMenu(win, id),
  installUpdate: () => installUpdate(),
  shieldToggle: (win) => {
    const t = activeTab(win);
    if (!t) return;
    const site = adblock.siteOf(displayUrl(t.url));
    if (!site) return;
    const s = S();
    s.adblockAllow = s.adblockAllow.includes(site) ? s.adblockAllow.filter(x => x !== site) : [...s.adblockAllow, site];
    store.settings.save();
    t.view && t.view.webContents.reload();
    broadcastSettings();
  },
  setSetting: (win, key, value) => { if (key in store.DEFAULT_SETTINGS) { S()[key] = value; store.settings.save(); broadcastSettings(); } },
  downloadAction: (win, id, action) => downloadAction(id, action),
  layout: (win, r) => {
    const insetOf = (rect) => rect && {
      left: Math.round(rect.x), top: Math.round(rect.y),
      right: Math.round(r.vw - rect.x - rect.width), bottom: Math.round(r.vh - rect.y - rect.height),
      width: Math.round(rect.width)
    };
    win.nq.insets = { view: insetOf(r.view), panel: insetOf(r.panel) };
    applyLayout(win);
  },
  menu: (win, name) => {
    const t = activeTab(win);
    const wc = t && t.view && t.view.webContents;
    switch (name) {
      case 'newWindow': createWindow(); break;
      case 'privateWindow': createWindow({ isPrivate: true }); break;
      case 'print': wc && wc.print(); break;
      case 'savePage': t && savePage(win, t); break;
      case 'devtools': wc && wc.toggleDevTools(); break;
      case 'snapshot': win.webContents.send('command', { cmd: 'snapshot' }); break;
      case 'lock': if (!lockNow()) openInternal(win, 'settings', 'privacidade'); break;
      case 'fullscreen': win.setFullScreen(!win.isFullScreen()); break;
      case 'find': openFind(win); break;
      case 'reopen': reopenClosed(win); break;
      case 'quit': app.quit(); break;
      case 'history': case 'downloads': case 'bookmarks': case 'settings': openInternal(win, name); break;
    }
  },
  focusPage: (win) => { const t = activeTab(win); if (t && t.view && !win.nq.frozen) t.view.webContents.focus(); }
};

ipcMain.on('ui:act', (e, action, ...args) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !win.nq || e.sender !== win.webContents) return;
  const fn = uiActions[action];
  if (fn) {
    try { fn(win, ...args); } catch (err) { console.error('Acao falhou:', action, err); }
  }
});

ipcMain.handle('ui:invoke', async (e, action, ...args) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !win.nq || e.sender !== win.webContents) return null;
  const nq = win.nq;
  switch (action) {
    case 'state': return buildState(win);
    case 'update': return updateState;
    case 'downloads': return dlList.slice(0, 60).map(dlPublic);
    case 'freeze': {
      const tab = activeTab(win);
      nq.frozen = true;
      let data = null, panel = null;
      const pv = nq.panelOpen && nq.panelViews.get(nq.panelOpen);
      try {
        if (tab && tab.view) {
          const img = await tab.view.webContents.capturePage();
          data = img.isEmpty() ? null : img.toDataURL();
        }
        if (pv && !nq.panelHidden && nq.htmlFull == null) {
          // se a capa esta por cima do painel, a imagem congelada e a da capa
          const st = nq.panelState.get(nq.panelOpen);
          const src = st && st.status !== 'ready' && nq.cover && !nq.cover.webContents.isDestroyed() ? nq.cover : pv;
          const img = await src.webContents.capturePage();
          if (!img.isEmpty()) panel = { data: img.toDataURL(), rect: pv.getBounds() };
        }
      } catch { /* sem captura */ }
      if (nq.frozen) {
        if (tab && tab.view) tab.view.setVisible(false);
        if (pv) { nq.panelHidden = true; pv.setVisible(false); }
        if (nq.grip) nq.grip.setVisible(false);
        if (nq.cover) nq.cover.setVisible(false);
      }
      return { page: data, panel };
    }
    case 'unfreeze': {
      nq.frozen = false;
      nq.panelHidden = false;
      nq.snapping = false;
      applyLayout(win);
      return true;
    }
    case 'suggest': return suggest(String(args[0] || ''));
    case 'snapStart': return snapStart(win);
    case 'snapFull': return snapFull(win);
    case 'snapCopy': return copyImage(String(args[0] || ''));
    case 'snapSave': return snapSave(win, String(args[0] || ''));
    case 'snapShow': if (args[0]) shell.showItemInFolder(String(args[0])); return true;
  }
  return null;
});

async function suggest(text) {
  const q = text.trim().toLowerCase();
  if (!q) return { local: [], remote: [] };
  const seen = new Set();
  const local = [];
  const score = (item) => {
    const u = item.url.toLowerCase();
    const t = (item.title || '').toLowerCase();
    const host = u.replace(/^https?:\/\/(www\.)?/, '');
    if (host.startsWith(q)) return 3;
    if (t.startsWith(q)) return 2;
    return u.includes(q) || t.includes(q) ? 1 : 0;
  };
  for (const b of store.bookmarks.data) {
    const sc = score(b);
    if (sc && !seen.has(b.url)) { seen.add(b.url); local.push({ ...b, kind: 'favorito', sc: sc + 1 }); }
  }
  const hist = store.history.data;
  for (let i = hist.length - 1; i >= 0 && local.length < 40; i--) {
    const h = hist[i];
    const sc = score(h);
    if (sc && !seen.has(h.url)) { seen.add(h.url); local.push({ url: h.url, title: h.title, kind: 'historico', sc }); }
  }
  local.sort((a, b) => b.sc - a.sc);
  let remote = [];
  const eng = S().searchEngine;
  if (S().suggestions && (eng === 'google' || eng === 'duckduckgo')) {
    try {
      const url = eng === 'google'
        ? 'https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&q=' + encodeURIComponent(text)
        : 'https://duckduckgo.com/ac/?type=list&q=' + encodeURIComponent(text);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1200);
      const res = await net.fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const json = await res.json();
      remote = (Array.isArray(json) && Array.isArray(json[1]) ? json[1] : []).slice(0, 5);
    } catch { /* sem sugestoes remotas */ }
  }
  return { local: local.slice(0, 5).map(({ url, title, kind }) => ({ url, title, kind })), remote };
}

// ---------- IPC: paginas internas ----------

const internalApi = {
  settings: () => publicSettings(),
  setSetting: ({ key, value }) => {
    if (!(key in store.DEFAULT_SETTINGS) || key === 'windowBounds') return false;
    if (key === 'panels' && Array.isArray(value)) value = value.map(p => (PANEL_BRAND[p.id] ? { ...p, icon: null } : p));
    S()[key] = value;
    store.settings.save();
    broadcastSettings();
    if (key === 'panelWidth') allWindows().forEach(applyLayout);
    if (key === 'panels') {
      ensurePanelIcons();
      for (const w of allWindows()) {
        for (const id of [...w.nq.panelViews.keys()]) {
          const p = value.find(x => x.id === id);
          if (!p || !p.enabled) destroyPanel(w, id);
        }
      }
    }
    return true;
  },
  resetSettings: () => {
    const keep = { windowBounds: S().windowBounds, lockGuard: S().lockGuard };
    store.settings.data = { ...structuredClone(store.DEFAULT_SETTINGS), ...keep };
    store.settings.save();
    broadcastSettings();
    return true;
  },
  history: ({ query = '', offset = 0, limit = 120 } = {}) => {
    const q = query.trim().toLowerCase();
    const out = [];
    const list = store.history.data;
    let skipped = 0;
    for (let i = list.length - 1; i >= 0 && out.length < limit; i--) {
      const h = list[i];
      if (q && !h.url.toLowerCase().includes(q) && !(h.title || '').toLowerCase().includes(q)) continue;
      if (skipped++ < offset) continue;
      out.push(h);
    }
    return out;
  },
  deleteHistory: (ids) => {
    const set = new Set(ids);
    store.history.data = store.history.data.filter(h => !set.has(h.id));
    store.history.save();
    return true;
  },
  clearData: async ({ history, cookies, cache, downloads, since = 0 }) => {
    if (history) {
      store.history.data = since ? store.history.data.filter(h => h.time < since) : [];
      store.history.save();
    }
    if (downloads) { dlList = dlList.filter(d => d.state === 'progressing'); persistDownloads(); pushDownloads(true); }
    if (cache) await session.defaultSession.clearCache();
    if (cookies) {
      await session.defaultSession.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'websql', 'shadercache'] });
      if (lockEnabled()) await setCookieGuard(true);
    }
    return true;
  },
  bookmarks: () => store.bookmarks.data,
  addBookmark: ({ url, title }) => { addBookmark(toUrl(url), title); return true; },
  updateBookmark: ({ id, url, title }) => {
    const b = store.bookmarks.data.find(x => x.id === id);
    if (!b) return false;
    if (title !== undefined) b.title = title;
    if (url !== undefined) b.url = toUrl(url) || b.url;
    store.bookmarks.save();
    broadcastState();
    return true;
  },
  removeBookmark: (id) => { removeBookmark(id); return true; },
  moveBookmark: ({ id, index }) => {
    const list = store.bookmarks.data;
    const from = list.findIndex(b => b.id === id);
    if (from < 0) return false;
    const [b] = list.splice(from, 1);
    list.splice(Math.max(0, Math.min(index, list.length)), 0, b);
    store.bookmarks.save();
    broadcastState();
    return true;
  },
  importBookmarks: async (_e, win) => {
    const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Favoritos exportados (HTML)', extensions: ['html', 'htm'] }], properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return 0;
    const items = parseBookmarksHtml(fs.readFileSync(r.filePaths[0], 'utf8'));
    let n = 0;
    for (const it of items) {
      if (!findBookmark(it.url)) {
        store.bookmarks.data.push({ id: Date.now() * 1000 + n, url: it.url, title: it.title, favicon: null, created: Date.now() });
        n++;
      }
    }
    store.bookmarks.save();
    broadcastState();
    return n;
  },
  exportBookmarks: async (_e, win) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), 'favoritos-nanquim.html'), filters: [{ name: 'HTML', extensions: ['html'] }] });
    if (r.canceled || !r.filePath) return false;
    fs.writeFileSync(r.filePath, bookmarksToHtml(store.bookmarks.data));
    return true;
  },
  downloads: () => dlList.slice(0, 200).map(dlPublic),
  downloadAction: ({ id, action }) => { downloadAction(id, action); return true; },
  chooseDownloadDir: async (_e, win) => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    S().downloadDir = r.filePaths[0];
    store.settings.save();
    return r.filePaths[0];
  },
  permissions: () => store.permissions.data,
  removePermission: ({ origin, perm }) => {
    const p = store.permissions.data[origin];
    if (p) { delete p[perm]; if (!Object.keys(p).length) delete store.permissions.data[origin]; store.permissions.save(); }
    return true;
  },
  extensions: () => extensionsInfo(),
  addExtension: async (_e, win) => {
    const r = await dialog.showOpenDialog(win, { title: 'Escolha a pasta da extensão (com manifest.json)', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    const dir = r.filePaths[0];
    try {
      await session.defaultSession.extensions.loadExtension(dir, { allowFileAccess: true });
      if (!S().extensions.includes(dir)) S().extensions.push(dir);
      store.settings.save();
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  },
  removeExtension: ({ id, path: dir }) => {
    try { session.defaultSession.extensions.removeExtension(id); } catch { /* ignorado */ }
    S().extensions = S().extensions.filter(x => x !== dir);
    store.settings.save();
    return true;
  },
  setDefaultBrowser: () => {
    app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
    if (process.platform === 'win32') shell.openExternal('ms-settings:defaultapps');
    return true;
  },
  info: () => ({
    version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome,
    node: process.versions.node, platform: process.platform, userData: app.getPath('userData'),
    downloads: S().downloadDir || app.getPath('downloads'),
    blocklist: adblock.size, blockedTotal: adblock.total,
    isDefault: app.isDefaultProtocolClient('https')
  }),
  update: () => updateState,
  checkUpdates: () => { checkUpdates(); return updateState; },
  installUpdate: () => { installUpdate(); return true; },
  lockInfo: () => ({ enabled: lockEnabled(), hasHint: !!(store.lock.data && store.lock.data.hint), idleMinutes: S().lockIdleMinutes || 0 }),
  lockSet: async ({ current, password, hint } = {}) => {
    if (lockEnabled()) {
      const v = await verifyPassword(current);
      if (!v.ok) return { ok: false, error: v.waitMs ? 'Muitas tentativas erradas. Espere um pouco.' : 'A senha atual não confere.' };
    }
    password = String(password || '');
    hint = String(hint || '').trim();
    if (password.length < 4) return { ok: false, error: 'A senha precisa ter pelo menos 4 caracteres.' };
    if (hint && hint.toLowerCase().includes(password.toLowerCase())) return { ok: false, error: 'A dica não pode ter a senha dentro dela.' };
    await setPassword(password, hint);
    broadcastState();
    return { ok: true };
  },
  lockRemove: async ({ current } = {}) => {
    if (!lockEnabled()) return { ok: true };
    const v = await verifyPassword(current);
    if (!v.ok) return { ok: false, error: v.waitMs ? 'Muitas tentativas erradas. Espere um pouco.' : 'A senha atual não confere.' };
    clearPassword();
    broadcastState();
    return { ok: true };
  },
  lockNow: () => lockNow(),
  openFolder: (which) => shell.openPath(which === 'data' ? app.getPath('userData') : (S().downloadDir || app.getPath('downloads')))
};

ipcMain.handle('nq:api', async (e, method, arg) => {
  if (!isInternalSender(e)) throw new Error('acesso negado');
  const fn = internalApi[method];
  if (!fn) throw new Error('metodo desconhecido: ' + method);
  const win = BrowserWindow.fromWebContents(e.sender) || findTabByWc(e.sender.id)?.win || focusedWindow();
  if (['importBookmarks', 'exportBookmarks', 'chooseDownloadDir', 'addExtension'].includes(method)) return fn(e, win);
  return fn(arg);
});

ipcMain.on('nq:google-ua', (e) => { e.returnValue = ELECTRON_UA; });

// navegacao a partir das paginas internas (pesquisa da nova aba, links do historico)
ipcMain.on('nq:open', (e, url, newTab) => {
  if (!isInternalSender(e)) return;
  const found = findTabByWc(e.sender.id);
  const win = found ? found.win : focusedWindow();
  if (!win) return;
  if (newTab) createTab(win, url, { active: false, afterId: found && found.tab.id });
  else if (found) navigate(win, url, found.tab);
  else navigate(win, url);
});

// ---------- tarefas de fundo: metricas, suspensao de abas, limite de RAM ----------

let lastMetrics = { ram: 0, cpu: 0 };
function sampleMetrics() {
  const m = app.getAppMetrics();
  const ram = m.reduce((a, x) => a + (x.memory ? x.memory.workingSetSize : 0), 0) / 1024;
  const cpu = m.reduce((a, x) => a + (x.cpu ? x.cpu.percentCPUUsage : 0), 0);
  lastMetrics = { ram: Math.round(ram), cpu: Math.round(cpu) };
  for (const w of allWindows()) w.webContents.send('metrics', { ...lastMetrics, limit: S().ramLimitMB, blocked: adblock.total });
}

function housekeeping() {
  const s = S();
  const now = Date.now();
  if (s.sleepMinutes > 0) {
    for (const w of allWindows()) {
      for (const t of w.nq.tabs) {
        if (t.view && t.id !== w.nq.activeId && !t.audible && !t.pinned && now - t.lastActive > s.sleepMinutes * 60000) discardTab(w, t);
      }
    }
  }
  if (s.ramLimitMB > 0 && lastMetrics.ram > s.ramLimitMB) {
    const candidates = [];
    for (const w of allWindows()) for (const t of w.nq.tabs) if (t.view && t.id !== w.nq.activeId && !t.audible) candidates.push({ w, t });
    candidates.sort((a, b) => a.t.lastActive - b.t.lastActive);
    if (candidates[0]) discardTab(candidates[0].w, candidates[0].t);
  }
}

// ---------- senha para abrir o Nanquim ----------
// A senha nunca e guardada: so o resultado do scrypt (um embaralhamento lento de proposito, com sal),
// que serve para conferir a senha mas nao para descobrir qual ela e.
// Sem a senha, nenhuma janela, aba ou painel e criado, e nao existe atalho para entrar sem ela.
const crypto = require('crypto');
const scryptAsync = require('util').promisify(crypto.scrypt);
const LOCK_HTML = path.join(ROOT, 'ui', 'lock.html');
const PRELOAD_LOCK = path.join(ROOT, 'preload', 'lock.js');
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
let lockWin = null;
let lockMode = null; // 'start' (ao abrir o Nanquim) ou 'pause' (bloqueado com o navegador aberto)
let browserOpen = false;
let pendingUrls = [];
let lockBusy = false;

function lockEnabled() { const d = store.lock && store.lock.data; return !!(d && d.hash && d.salt); }

async function hashPassword(pw, saltHex) {
  const key = await scryptAsync(String(pw).normalize('NFC'), Buffer.from(saltHex, 'hex'), 32, SCRYPT);
  return key.toString('hex');
}

async function setPassword(pw, hint) {
  const salt = crypto.randomBytes(16).toString('hex');
  store.lock.data = { v: 1, hash: await hashPassword(pw, salt), salt, hint: String(hint || '').slice(0, 80), fails: 0, until: 0 };
  store.lock.save(true);
  setLockGuard(true);
}

function clearPassword() { store.lock.data = {}; store.lock.save(true); setLockGuard(false); }

// Marca que existe senha em dois lugares: nas configuracoes e num cookie guardado junto com os logins
// dos sites. Se alguem apagar o arquivo da senha por fora do Nanquim, a marca continua e ele nao abre.
// Para tirar a marca do cookie e preciso apagar os cookies, o que tambem apaga os logins.
const GUARD_URL = 'https://trava.nanquim.invalid/';
const GUARD_NAME = 'nq_trava';
function setLockGuard(on) {
  if (!!S().lockGuard !== on) { S().lockGuard = on; store.settings.save(true); }
  setCookieGuard(on);
}
async function setCookieGuard(on) {
  const ses = session.defaultSession;
  try {
    if (on) await ses.cookies.set({ url: GUARD_URL, name: GUARD_NAME, value: '1', secure: true, httpOnly: true, expirationDate: Math.floor(Date.now() / 1000) + 10 * 365 * 86400 });
    else await ses.cookies.remove(GUARD_URL, GUARD_NAME);
    await ses.cookies.flushStore();
  } catch { /* ignorado */ }
}
async function hasCookieGuard() {
  try { return (await session.defaultSession.cookies.get({ url: GUARD_URL, name: GUARD_NAME })).length > 0; } catch { return false; }
}

function lockWaitMs() { return Math.max(0, (store.lock.data.until || 0) - Date.now()); }
function lockHint() { const d = store.lock.data; return d.fails >= 2 && d.hint ? d.hint : ''; }

// confere a senha contando as tentativas erradas: a partir da 5a, espera 30 s, depois 1 min, 2 min... (ate 15 min)
async function verifyPassword(pw) {
  if (!lockEnabled()) return { ok: true };
  const wait = lockWaitMs();
  if (wait > 0) return { ok: false, waitMs: wait };
  const d = store.lock.data;
  const got = Buffer.from(await hashPassword(String(pw || ''), d.salt), 'hex');
  const ref = Buffer.from(d.hash, 'hex');
  const ok = got.length === ref.length && crypto.timingSafeEqual(got, ref);
  if (ok) { d.fails = 0; d.until = 0; }
  else {
    d.fails = (d.fails || 0) + 1;
    if (d.fails >= 5) d.until = Date.now() + Math.min(15 * 60000, 30000 * Math.pow(2, d.fails - 5));
  }
  store.lock.save(true);
  return ok ? { ok: true } : { ok: false, waitMs: lockWaitMs() };
}

function showLock(mode) {
  lockMode = mode;
  if (lockWin && !lockWin.isDestroyed()) { lockWin.show(); lockWin.focus(); return; }
  const t = themeOf();
  const win = new BrowserWindow({
    width: 440, height: 600, resizable: false, maximizable: false, fullscreenable: false,
    show: false, center: true, title: 'Nanquim', icon: ICON, backgroundColor: t.page,
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? undefined : { color: t.page, symbolColor: t.fg, height: 46 },
    webPreferences: { preload: PRELOAD_LOCK, contextIsolation: true, sandbox: true, spellcheck: false, devTools: false }
  });
  lockWin = win;
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(LOCK_HTML);
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  win.on('closed', () => {
    if (lockWin === win) lockWin = null;
    // fechou a tela de senha sem entrar: fecha o Nanquim inteiro, inclusive as janelas escondidas
    if (lockMode) { lockMode = null; app.quit(); }
  });
}

// bloqueia com o navegador aberto: esconde todas as janelas e mostra a tela de senha
function lockNow() {
  if (!lockEnabled() || lockMode || !browserOpen) return false;
  for (const w of allWindows()) {
    for (const t of w.nq.tabs) { try { if (t.view && t.view.webContents.isDevToolsOpened()) t.view.webContents.closeDevTools(); } catch { /* ignorado */ } }
    w.nq.hiddenByLock = true;
    w.hide();
  }
  showLock('pause');
  return true;
}

function openBrowser() {
  browserOpen = true;
  const urls = pendingUrls.splice(0);
  const saved = store.session.data.windows || [];
  if (S().startup === 'restore' && saved.length) {
    saved.forEach((w, i) => createWindow({ restoredTabs: w.tabs, activeIndex: w.active, urls: i === 0 ? urls : [] }));
  } else {
    createWindow({ urls });
  }
}

function unlockDone() {
  const mode = lockMode;
  lockMode = null; // a partir daqui fechar a tela de senha nao fecha o Nanquim
  if (mode === 'start') openBrowser();
  else {
    for (const w of allWindows()) if (w.nq.hiddenByLock) { w.nq.hiddenByLock = false; w.show(); }
    const win = focusedWindow();
    if (win) { win.focus(); pendingUrls.splice(0).forEach(u => createTab(win, u)); }
  }
  const lw = lockWin;
  setTimeout(() => { if (lw && !lw.isDestroyed()) lw.close(); }, mode === 'start' ? 700 : 380);
}

const fromLockScreen = (e) => !!lockWin && !lockWin.isDestroyed() && e.sender === lockWin.webContents;

ipcMain.handle('lock:info', (e) => {
  if (!fromLockScreen(e)) return null;
  return { theme: S().theme, accent: S().accent, enso: S().enso, mode: lockMode, waitMs: lockWaitMs(), hint: lockHint() };
});

ipcMain.handle('lock:try', async (e, pw) => {
  // sem o arquivo da senha (modo 'tamper') nenhuma senha serve e nao tem como entrar
  if (!fromLockScreen(e) || !lockMode || lockMode === 'tamper' || lockBusy) return { ok: false };
  lockBusy = true;
  try {
    const r = await verifyPassword(pw);
    if (r.ok) { unlockDone(); return { ok: true }; }
    return { ok: false, waitMs: r.waitMs || 0, hint: lockHint() };
  } finally { lockBusy = false; }
});

// bloqueio automatico: depois de X minutos sem mexer no computador, e quando o Windows e bloqueado
function autoLockCheck() {
  const min = S().lockIdleMinutes || 0;
  if (!min || !lockEnabled() || lockMode || !browserOpen) return;
  try { if (powerMonitor.getSystemIdleTime() >= min * 60) lockNow(); } catch { /* ignorado */ }
}

// ---------- ciclo de vida ----------

function urlsFromArgv(argv) {
  return argv.slice(1).filter(a => /^https?:\/\//i.test(a) || /\.(html?|pdf|svg)$/i.test(a) && fs.existsSync(a))
    .map(a => /^https?:/i.test(a) ? a : pathToFileURL(path.resolve(a)).toString());
}

app.on('second-instance', (e, argv) => {
  const urls = urlsFromArgv(argv);
  // com a tela de senha aberta, nada abre: os links esperam a senha
  if (lockMode) {
    pendingUrls.push(...urls);
    if (lockWin && !lockWin.isDestroyed()) { if (lockWin.isMinimized()) lockWin.restore(); lockWin.show(); lockWin.focus(); }
    return;
  }
  const win = focusedWindow();
  if (!win) return createWindow({ urls });
  if (win.isMinimized()) win.restore();
  win.focus();
  if (urls.length) urls.forEach(u => createTab(win, u));
  else createWindow();
});

app.on('open-url', (e, url) => {
  e.preventDefault();
  if (lockMode || !browserOpen) { pendingUrls.push(url); return; }
  const win = focusedWindow();
  if (win) createTab(win, url); else app.whenReady().then(() => createWindow({ urls: [url] }));
});

app.whenReady().then(async () => {
  store.init();
  // identidade original do Electron (sem o nome do app), usada so no login do Google
  ELECTRON_UA = app.userAgentFallback.replace(/\s[Nn]anquim\/\S+/, '');
  // no resto da navegacao, tira o "Electron" para os sites tratarem como Chrome comum
  CHROME_UA = ELECTRON_UA.replace(/\sElectron\/\S+/, '');
  app.userAgentFallback = CHROME_UA;
  adblock.init(() => S(), (wcId) => {
    const f = findTabByWc(wcId);
    if (f && f.tab.id === f.win.nq.activeId) sendState(f.win);
  });
  prepareSession(session.defaultSession, false);

  let id = 0;
  dlList = store.downloads.data.map(d => ({ ...d, id: ++id, item: null }));
  dlSeq = id;

  await loadExtensions();

  pendingUrls.push(...urlsFromArgv(process.argv));
  if (lockEnabled()) { setLockGuard(true); showLock('start'); }
  else if (S().lockGuard || await hasCookieGuard()) showLock('tamper');
  else openBrowser();

  ensurePanelIcons();
  setupUpdater();
  setInterval(sampleMetrics, 3000);
  setInterval(housekeeping, 20000);
  setInterval(autoLockCheck, 15000);
  for (const ev of ['lock-screen', 'suspend']) {
    try { powerMonitor.on(ev, () => { if ((S().lockIdleMinutes || 0) > 0) lockNow(); }); } catch { /* ignorado */ }
  }
});

app.on('before-quit', () => {
  if (!sessionLocked && browserOpen) { saveSession(true); sessionLocked = true; }
  store.flushAll();
});

app.on('window-all-closed', () => {
  store.flushAll();
  app.quit();
});
