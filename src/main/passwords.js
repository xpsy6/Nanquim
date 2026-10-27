// Cofre de senhas do Nanquim.
// Cada senha e criptografada com a protecao do proprio Windows (safeStorage, que usa o DPAPI):
// so a sua conta do Windows, neste computador, consegue abrir. O arquivo passwords.json guarda
// apenas o endereco do site, o usuario/e-mail e a senha ja criptografada.
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let data = null;
let saveTimer = null;
const file = () => path.join(app.getPath('userData'), 'passwords.json');

function load() {
  if (data) return data;
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    data = { v: 1, items: Array.isArray(raw.items) ? raw.items : [], never: Array.isArray(raw.never) ? raw.never : [] };
  } catch { data = { v: 1, items: [], never: [] }; }
  return data;
}

function save(now = false) {
  clearTimeout(saveTimer);
  const write = () => {
    try {
      const tmp = file() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, file());
    } catch (err) { console.error('Falha ao salvar senhas', err); }
  };
  if (now) write(); else saveTimer = setTimeout(write, 300);
}
function flush() { if (saveTimer) save(true); }

function available() {
  try { return safeStorage.isEncryptionAvailable(); } catch { return false; }
}

// chave do site: protocolo + endereco sem "www." (+ porta). instagram.com e www.instagram.com sao o mesmo site
function siteKey(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return '';
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, '')}${u.port ? ':' + u.port : ''}`;
  } catch { return ''; }
}
const hostOfKey = (key) => key.replace(/^https?:\/\//, '');

function enc(pw) { return safeStorage.encryptString(String(pw)).toString('base64'); }
function dec(b64) { try { return safeStorage.decryptString(Buffer.from(b64, 'base64')); } catch { return null; } }

function publicItem(it) {
  return { id: it.id, site: it.o, host: hostOfKey(it.o), username: it.u, created: it.c, used: it.t || 0 };
}

function forSite(key) {
  return load().items.filter(it => it.o === key).sort((a, b) => (b.t || b.c) - (a.t || a.c)).map(publicItem);
}

function all(query = '') {
  const q = String(query).trim().toLowerCase();
  return load().items
    .filter(it => !q || it.o.toLowerCase().includes(q) || it.u.toLowerCase().includes(q))
    .sort((a, b) => hostOfKey(a.o).localeCompare(hostOfKey(b.o)) || a.u.localeCompare(b.u))
    .map(publicItem);
}

function count() { return load().items.length; }

function find(key, username) { return load().items.find(it => it.o === key && it.u === username); }

// o que fazer com um login que acabou de ser enviado: 'save' (novo), 'update' (senha mudou) ou null
function decide(key, username, password) {
  if (!key || !password) return null;
  const d = load();
  if (d.never.includes(key)) return null;
  const same = d.items.find(it => it.o === key && it.u === username);
  if (!same) {
    // conta sem usuario conhecido mas a senha ja esta guardada no mesmo site: nada a fazer
    if (!username && d.items.some(it => it.o === key && dec(it.p) === password)) return null;
    return 'save';
  }
  return dec(same.p) === password ? null : 'update';
}

function store(key, username, password) {
  if (!available()) return { ok: false, error: 'O Windows não liberou a criptografia agora.' };
  const d = load();
  const now = Date.now();
  const same = d.items.find(it => it.o === key && it.u === username);
  if (same) { same.p = enc(password); same.t = now; }
  else d.items.push({ id: crypto.randomBytes(8).toString('hex'), o: key, u: String(username || ''), p: enc(password), c: now, t: now });
  d.never = d.never.filter(k => k !== key);
  save();
  return { ok: true };
}

function reveal(id) {
  const it = load().items.find(x => x.id === id);
  return it ? dec(it.p) : null;
}

// senha para preencher: so sai se o site de quem pede for o mesmo da senha guardada
function fill(id, key) {
  const it = load().items.find(x => x.id === id);
  if (!it || it.o !== key) return null;
  const password = dec(it.p);
  if (password == null) return null;
  it.t = Date.now();
  save();
  return { username: it.u, password };
}

function remove(id) {
  const d = load();
  const before = d.items.length;
  d.items = d.items.filter(x => x.id !== id);
  if (d.items.length !== before) save();
  return d.items.length !== before;
}

function never(key) {
  const d = load();
  if (key && !d.never.includes(key)) { d.never.push(key); save(); }
}
function neverList() { return load().never.map(k => ({ site: k, host: hostOfKey(k) })); }
function unNever(key) { const d = load(); d.never = d.never.filter(k => k !== key); save(); }

// e-mails ja usados em qualquer site (para sugerir em campos de e-mail)
function emails() {
  const seen = new Map();
  for (const it of load().items) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(it.u)) continue;
    const k = it.u.toLowerCase();
    seen.set(k, Math.max(seen.get(k) || 0, it.t || it.c));
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e).slice(0, 6);
}

// CSV exportado pelo Chrome/Edge/Opera: name,url,username,password(,note)
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

function importCsv(text) {
  if (!available()) return { ok: false, error: 'O Windows não liberou a criptografia agora.' };
  const rows = parseCsv(String(text).replace(/^﻿/, ''));
  if (!rows.length) return { ok: false, error: 'O arquivo está vazio.' };
  const head = rows[0].map(h => h.trim().toLowerCase());
  const iu = head.indexOf('url'), iu2 = head.indexOf('username'), ip = head.indexOf('password');
  if (iu < 0 || iu2 < 0 || ip < 0) return { ok: false, error: 'Esse arquivo não parece uma exportação de senhas do Chrome (faltam as colunas url, username e password).' };
  let added = 0, updated = 0, skipped = 0;
  for (const r of rows.slice(1)) {
    const key = siteKey((r[iu] || '').trim());
    const user = (r[iu2] || '').trim();
    const pw = r[ip] || '';
    if (!key || !pw) { skipped++; continue; }
    const same = find(key, user);
    if (same && dec(same.p) === pw) { skipped++; continue; }
    store(key, user, pw);
    if (same) updated++; else added++;
  }
  save(true);
  return { ok: true, added, updated, skipped };
}

module.exports = { siteKey, available, forSite, all, count, decide, store, reveal, fill, remove, never, neverList, unNever, emails, importCsv, flush };
