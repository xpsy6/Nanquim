// Armazenamento simples em arquivos JSON dentro da pasta de dados do usuario.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DIR = () => app.getPath('userData');

class JsonFile {
  constructor(name, defaults) {
    this.file = path.join(DIR(), name + '.json');
    this.defaults = defaults;
    this.timer = null;
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(defaults)) this.data = Array.isArray(raw) ? raw : structuredClone(defaults);
      else this.data = { ...structuredClone(defaults), ...raw };
    } catch {
      this.data = structuredClone(defaults);
    }
  }
  save(now = false) {
    clearTimeout(this.timer);
    const write = () => {
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const tmp = this.file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(this.data));
        fs.renameSync(tmp, this.file);
      } catch (err) {
        console.error('Falha ao salvar', this.file, err);
      }
    };
    if (now) write();
    else this.timer = setTimeout(write, 400);
  }
  flush() { if (this.timer) this.save(true); }
}

const DEFAULT_PANELS = [
  { id: 'whatsapp', name: 'WhatsApp', short: 'WA', url: 'https://web.whatsapp.com/', enabled: true },
  { id: 'instagram', name: 'Instagram', short: 'IG', url: 'https://www.instagram.com/direct/inbox/', enabled: true },
  { id: 'discord', name: 'Discord', short: 'DC', url: 'https://discord.com/app', enabled: true },
  { id: 'spotify', name: 'Spotify', short: 'SP', url: 'https://open.spotify.com/', enabled: true },
  { id: 'telegram', name: 'Telegram', short: 'TG', url: 'https://web.telegram.org/a/', enabled: false },
  { id: 'ytmusic', name: 'YouTube Music', short: 'YM', url: 'https://music.youtube.com/', enabled: false }
];

const DEFAULT_DIAL = [
  { title: 'YouTube', url: 'https://www.youtube.com/' },
  { title: 'Gmail', url: 'https://mail.google.com/' },
  { title: 'GitHub', url: 'https://github.com/' },
  { title: 'Instagram', url: 'https://www.instagram.com/' },
  { title: 'WhatsApp', url: 'https://web.whatsapp.com/' },
  { title: 'Twitch', url: 'https://www.twitch.tv/' },
  { title: 'Mercado Livre', url: 'https://www.mercadolivre.com.br/' },
  { title: 'Netflix', url: 'https://www.netflix.com/' }
];

const DEFAULT_SETTINGS = {
  theme: 'tinta',
  accent: '#e0452b',
  enso: '#e0452b',
  searchEngine: 'google',
  homepage: 'nanquim://newtab',
  startup: 'restore',
  adblock: true,
  adblockAllow: [],
  bookmarksBar: true,
  sidebar: true,
  sleepMinutes: 30,
  ramLimitMB: 0,
  lockIdleMinutes: 0,
  askDownload: false,
  downloadDir: '',
  newtabClock: true,
  newtabTexture: true,
  suggestions: true,
  panels: DEFAULT_PANELS,
  panelWidth: 420,
  panelPinned: false,
  speedDial: DEFAULT_DIAL,
  extensions: [],
  windowBounds: null
};

let settings, bookmarks, history, downloads, session, permissions, lock, favicons;

function init() {
  settings = new JsonFile('settings', DEFAULT_SETTINGS);
  // garante paineis novos vindos de versoes futuras
  for (const p of DEFAULT_PANELS) {
    if (!settings.data.panels.find(x => x.id === p.id)) settings.data.panels.push({ ...p });
  }
  // quem vinha da versao 1.0 com o roxo antigo passa para as cores novas
  if (settings.data.accent === '#7d4dff') settings.data.accent = DEFAULT_SETTINGS.accent;
  if (!settings.data.enso) settings.data.enso = settings.data.accent;
  bookmarks = new JsonFile('bookmarks', []);
  history = new JsonFile('history', []);
  downloads = new JsonFile('downloads', []);
  session = new JsonFile('session', { windows: [] });
  permissions = new JsonFile('permissions', {});
  // senha para abrir: guarda so o resultado embaralhado (scrypt), nunca a senha
  lock = new JsonFile('lock', {});
  // icones dos sites ja visitados (por endereco), para as abas dormindo tambem mostrarem o icone
  favicons = new JsonFile('favicons', {});
}

function flushAll() {
  for (const f of [settings, bookmarks, history, downloads, session, permissions, lock, favicons]) f && f.flush();
}

module.exports = {
  init,
  flushAll,
  DEFAULT_SETTINGS,
  get settings() { return settings; },
  get lock() { return lock; },
  get favicons() { return favicons; },
  get bookmarks() { return bookmarks; },
  get history() { return history; },
  get downloads() { return downloads; },
  get session() { return session; },
  get permissions() { return permissions; }
};
