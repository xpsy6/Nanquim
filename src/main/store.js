// Armazenamento simples em arquivos JSON dentro da pasta de dados do usuario.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DIR = () => app.getPath('userData');

// Gravacao sem travar o navegador: o arquivo e escrito em segundo plano (assincrono), num arquivo
// temporario que depois troca de nome com o original. Varios pedidos seguidos viram uma gravacao so.
// Isso importa no pendrive, onde gravar alguns MB pode levar segundos.
const slowLog = [];
function noteSlow(file, ms, bytes) {
  if (ms < 150) return;
  slowLog.push({ t: Date.now(), file: path.basename(file), ms: Math.round(ms), kb: Math.round(bytes / 1024) });
  if (slowLog.length > 50) slowLog.shift();
}

class JsonFile {
  constructor(name, defaults, delay = 400) {
    this.file = path.join(DIR(), name + '.json');
    this.defaults = defaults;
    this.delay = delay;
    this.timer = null;
    this.writing = null;
    this.dirty = false;
    this.gen = 0;
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(defaults)) this.data = Array.isArray(raw) ? raw : structuredClone(defaults);
      else this.data = { ...structuredClone(defaults), ...raw };
    } catch {
      this.data = structuredClone(defaults);
    }
  }
  // grava ja, sem esperar (usado ao fechar o navegador e em mudancas que nao podem se perder)
  writeSync() {
    clearTimeout(this.timer);
    this.timer = null;
    this.dirty = false;
    this.gen++;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('Falha ao salvar', this.file, err);
    }
  }
  async writeAsync() {
    this.timer = null;
    if (this.writing) { this.dirty = true; return; }
    this.dirty = false;
    const text = JSON.stringify(this.data);
    const tmp = this.file + '.tmp-bg';
    const gen = this.gen;
    const t0 = Date.now();
    this.writing = (async () => {
      try {
        await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
        await fs.promises.writeFile(tmp, text);
        // se nesse meio tempo houve uma gravacao imediata (mais nova), descarta esta
        if (gen !== this.gen) { await fs.promises.unlink(tmp).catch(() => {}); return; }
        await fs.promises.rename(tmp, this.file);
      } catch (err) {
        console.error('Falha ao salvar', this.file, err);
      }
    })();
    await this.writing;
    noteSlow(this.file, Date.now() - t0, text.length);
    this.writing = null;
    if (this.dirty) this.save();
  }
  save(now = false) {
    if (now) return this.writeSync();
    if (this.timer) return;
    this.timer = setTimeout(() => this.writeAsync(), this.delay);
  }
  flush() { if (this.timer || this.dirty) this.writeSync(); }
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
  savePasswords: true,
  fillPasswords: true,
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
  history = new JsonFile('history', [], 3000);
  downloads = new JsonFile('downloads', []);
  session = new JsonFile('session', { windows: [] }, 1500);
  permissions = new JsonFile('permissions', {});
  // senha para abrir: guarda so o resultado embaralhado (scrypt), nunca a senha
  lock = new JsonFile('lock', {});
  // icones dos sites ja visitados (por endereco), para as abas dormindo tambem mostrarem o icone
  favicons = new JsonFile('favicons', {}, 8000);
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
  slowLog,
  get favicons() { return favicons; },
  get bookmarks() { return bookmarks; },
  get history() { return history; },
  get downloads() { return downloads; },
  get session() { return session; },
  get permissions() { return permissions; }
};
