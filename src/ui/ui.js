// Nanquim: logica da interface (abas, barra de endereco, menus, painel lateral).
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  fwd: '<path d="M9 5l7 7-7 7"/>',
  reload: '<path d="M19.5 13A7.5 7.5 0 1 1 17.3 6.7"/><path d="M19.5 3.5v5h-5"/>',
  stop: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  home: '<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 9.8V20h12V9.8"/>',
  star: '<path d="M12 3.6l2.6 5.4 5.9.7-4.4 4 1.2 5.9-5.3-3-5.3 3 1.2-5.9-4.4-4 5.9-.7z"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  menu: '<path d="M5 8h14M5 12h10M5 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17v.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  bookmark: '<path d="M7 4h10v16l-5-4-5 4z"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h4M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5c1.3 1.4 1.3 3.6 0 5M18 7c2.7 2.8 2.7 7.2 0 10"/>',
  muted: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  mask: '<circle cx="7.5" cy="14" r="3"/><circle cx="16.5" cy="14" r="3"/><path d="M10.5 14h3M3 9.5h18M6 9.5l1.5-5h9l1.5 5"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16"/>',
  window: '<rect x="3.5" y="5" width="17" height="14" rx="3"/>',
  printer: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  undo: '<path d="M9 4L4 9l5 5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  exit: '<path d="M10 4H4v16h6M14 8l4 4-4 4M18 12H9"/>',
  retry: '<path d="M19.5 13A7.5 7.5 0 1 1 17.3 6.7"/><path d="M19.5 3.5v5h-5"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  refresh: '<path d="M4.5 11A7.5 7.5 0 0 1 18 7M19.5 13A7.5 7.5 0 0 1 6 17"/><path d="M18 3v4h-4M6 21v-4h4"/>'
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

document.querySelectorAll('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); });
document.body.classList.add('platform-' + nq.platform);

// logo do Nanquim (enso com gota), usado nas abas das paginas internas
const NQ_LOGO = '<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="nq-logo-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26221e"/><stop offset="1" stop-color="#0f0e0c"/></linearGradient></defs><rect x="4" y="4" width="92" height="92" rx="24" fill="url(#nq-logo-t)"/><g fill="#f1eadc"><path d="M72.18 25.36 L73.21 25.96 L74.22 26.59 L75.21 27.27 L76.19 27.98 L77.15 28.74 L78.09 29.54 L79.00 30.38 L79.89 31.25 L80.59 32.26 L81.27 33.29 L81.90 34.35 L82.49 35.43 L83.05 36.54 L83.56 37.67 L84.03 38.82 L84.46 39.99 L84.84 41.18 L85.17 42.38 L85.46 43.60 L85.71 44.82 L85.90 46.06 L86.05 47.31 L86.15 48.56 L86.20 49.81 L86.20 51.07 L86.16 52.32 L86.06 53.58 L85.92 54.82 L85.73 56.07 L85.49 57.30 L85.20 58.52 L84.87 59.73 L84.49 60.93 L84.06 62.11 L83.59 63.27 L83.07 64.42 L82.52 65.54 L81.92 66.63 L81.28 67.71 L80.60 68.75 L79.88 69.77 L79.13 70.76 L78.34 71.72 L77.52 72.64 L76.66 73.54 L75.78 74.40 L74.86 75.22 L73.92 76.01 L72.95 76.76 L71.95 77.48 L70.94 78.15 L69.90 78.79 L68.84 79.39 L67.78 79.98 L66.71 80.54 L65.63 81.07 L64.52 81.56 L63.40 82.00 L62.27 82.41 L61.12 82.77 L59.97 83.09 L58.80 83.37 L57.63 83.61 L56.45 83.80 L55.26 83.95 L54.08 84.06 L52.89 84.12 L51.70 84.14 L50.51 84.12 L49.33 84.06 L48.15 83.95 L46.98 83.80 L45.82 83.62 L44.67 83.38 L43.53 83.11 L42.40 82.80 L41.28 82.45 L40.18 82.06 L39.10 81.63 L38.04 81.17 L36.99 80.67 L35.97 80.13 L34.96 79.56 L33.98 78.95 L33.03 78.32 L32.10 77.64 L31.20 76.94 L30.32 76.21 L29.47 75.45 L28.65 74.67 L27.86 73.85 L27.11 73.01 L26.38 72.15 L25.69 71.27 L25.03 70.36 L24.40 69.43 L23.81 68.49 L23.25 67.52 L22.72 66.54 L22.24 65.55 L21.78 64.54 L21.37 63.52 L20.99 62.49 L20.65 61.44 L20.34 60.39 L20.07 59.34 L19.84 58.27 L19.65 57.20 L19.49 56.13 L19.37 55.06 L19.29 53.98 L19.24 52.91 L19.23 51.83 L19.26 50.76 L19.32 49.70 L19.42 48.64 L19.55 47.58 L19.72 46.54 L19.93 45.50 L20.17 44.47 L20.44 43.45 L20.74 42.45 L21.08 41.46 L21.46 40.48 L21.86 39.51 L22.29 38.57 L22.76 37.64 L23.25 36.72 L23.78 35.83 L24.33 34.95 L24.91 34.10 L25.52 33.27 L26.15 32.46 L26.81 31.67 L27.50 30.91 L28.20 30.17 L28.94 29.45 L29.69 28.76 L30.46 28.10 L31.26 27.47 L32.08 26.86 L32.91 26.28 L33.76 25.73 L34.63 25.21 L35.52 24.72 L36.42 24.26 L37.33 23.83 L38.26 23.43 L39.19 23.07 L40.14 22.73 L41.10 22.43 L42.07 22.17 L43.05 21.93 L44.03 21.73 L45.02 21.57 L46.01 21.43 L47.01 21.34 L48.00 21.28 L49.00 21.26 L50.00 21.29 L50.00 24.49 L49.12 24.64 L48.25 24.79 L47.39 24.97 L46.53 25.17 L45.69 25.40 L44.86 25.65 L44.04 25.92 L43.23 26.22 L42.43 26.54 L41.65 26.89 L40.88 27.26 L40.12 27.66 L39.38 28.08 L38.66 28.52 L37.95 28.98 L37.26 29.46 L36.59 29.96 L35.94 30.49 L35.30 31.03 L34.69 31.59 L34.09 32.17 L33.52 32.77 L32.96 33.38 L32.43 34.01 L31.92 34.66 L31.42 35.32 L30.96 35.99 L30.51 36.68 L30.09 37.38 L29.69 38.10 L29.32 38.82 L28.97 39.56 L28.64 40.31 L28.34 41.06 L28.06 41.83 L27.81 42.60 L27.59 43.38 L27.39 44.16 L27.21 44.95 L27.07 45.75 L26.94 46.55 L26.85 47.35 L26.78 48.16 L26.74 48.96 L26.72 49.77 L26.73 50.58 L26.77 51.39 L26.84 52.19 L26.93 52.99 L27.05 53.79 L27.19 54.58 L27.36 55.37 L27.56 56.15 L27.79 56.93 L28.04 57.70 L28.31 58.46 L28.61 59.21 L28.94 59.94 L29.29 60.67 L29.67 61.39 L30.07 62.09 L30.49 62.78 L30.94 63.45 L31.41 64.11 L31.90 64.75 L32.42 65.38 L32.96 65.98 L33.52 66.57 L34.09 67.14 L34.69 67.69 L35.31 68.22 L35.94 68.72 L36.60 69.20 L37.27 69.66 L37.95 70.10 L38.65 70.51 L39.37 70.90 L40.10 71.26 L40.84 71.60 L41.59 71.91 L42.35 72.19 L43.13 72.44 L43.91 72.67 L44.70 72.87 L45.49 73.04 L46.30 73.18 L47.10 73.30 L47.91 73.38 L48.73 73.44 L49.54 73.46 L50.35 73.46 L51.17 73.43 L51.98 73.36 L52.79 73.27 L53.59 73.15 L54.39 73.00 L55.18 72.82 L55.96 72.61 L56.74 72.37 L57.51 72.11 L58.26 71.82 L59.00 71.50 L59.73 71.15 L60.45 70.78 L61.15 70.38 L61.84 69.96 L62.50 69.49 L63.12 68.98 L63.71 68.44 L64.29 67.88 L64.84 67.31 L65.37 66.71 L65.87 66.10 L66.35 65.47 L66.80 64.83 L67.23 64.18 L67.64 63.51 L68.01 62.84 L68.37 62.15 L68.69 61.45 L68.99 60.75 L69.27 60.04 L69.52 59.33 L69.74 58.60 L69.94 57.88 L70.11 57.15 L70.26 56.42 L70.39 55.69 L70.48 54.96 L70.56 54.23 L70.61 53.50 L70.64 52.77 L70.64 52.05 L70.62 51.32 L70.58 50.61 L70.52 49.89 L70.43 49.18 L70.32 48.48 L70.19 47.78 L70.04 47.09 L69.87 46.41 L69.68 45.74 L69.47 45.07 L69.23 44.41 L68.98 43.76 L68.71 43.13 L68.42 42.50 L68.11 41.88 L67.78 41.27 L67.44 40.68 L67.07 40.10 L66.69 39.53 L66.44 38.88 L66.16 38.23 L65.85 37.59 L65.52 36.95 L65.17 36.32 L64.79 35.71 L64.38 35.10 L63.95 34.51 Z"/><circle cx="68.07" cy="29.94" r="6.15"/><path d="M50.00 37.20 C47.20 43.36 38.80 50.08 38.80 58.48 A11.20 11.20 0 0 0 61.20 58.48 C61.20 50.08 52.80 43.36 50.00 37.20 Z"/></g></svg>';
let state = null;
let downloads = [];
let metrics = { ram: 0, cpu: 0, limit: 0, blocked: 0 };
let pop = null;
let frozen = false;
let editing = false;
let firstRender = true;

const layer = $('#layer');
const address = $('#address');
const omni = $('#omni');
const viewport = $('#viewport');
const frozenImg = $('#frozen');

// ---------- utilidades ----------

function looksLikeUrl(text) {
  text = text.trim();
  if (/\s/.test(text)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^(nanquim|about|view-source|data|file|mailto):/i.test(text)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(text) || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(text)) return true;
  return /^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(text);
}
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function stripUrl(url) { return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); }
function fmtBytes(n) {
  if (!n || n < 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)).toString().replace('.', ',') + ' ' + u[i];
}
function letterFor(title, url) { return ((hostOf(url || '') || title || '?').replace(/[^a-z0-9]/gi, '')[0] || '?').toUpperCase(); }
function contrastInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#151310' : '#ffffff';
}

// pincelada em arco (usada no anel do painel aberto)
function brushArc(cx, cy, R, a0, sweep, wMax, seed) {
  const N = 120, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const a = (a0 + sweep * p) * Math.PI / 180;
    const w = wMax * (0.55 + 0.45 * Math.sin(Math.min(1, p * 4) * Math.PI / 2)) * (1 - Math.pow(p, 2.6) * 0.9) * (1 + 0.08 * Math.sin(p * 21 + seed));
    const r = R + 0.8 * Math.sin(p * 5.3 + seed);
    outer.push([cx + Math.cos(a) * (r + w / 2), cy + Math.sin(a) * (r + w / 2)]);
    inner.push([cx + Math.cos(a) * (r - w / 2), cy + Math.sin(a) * (r - w / 2)]);
  }
  return 'M' + outer.concat(inner.reverse()).map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z';
}
const RING_D = brushArc(27, 27, 23.5, -80, 330, 3.4, 9);

// gota de tinta no clique
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.panel-btn, .rail-btn, #btn-newtab');
  if (!b || e.button !== 0) return;
  const d = document.createElement('span');
  d.className = 'drop';
  b.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
});

// ---------- congelar a pagina (para os menus ficarem por cima) ----------

const frozenPanel = $('#frozen-panel');
async function freeze() {
  if (frozen) return;
  frozen = true;
  const r = await nq.invoke('freeze');
  if (!frozen || !r) return;
  if (r.page) { frozenImg.src = r.page; frozenImg.hidden = false; }
  if (r.panel) {
    const b = r.panel.rect;
    Object.assign(frozenPanel.style, { left: b.x + 'px', top: b.y + 'px', width: b.width + 'px', height: b.height + 'px' });
    frozenPanel.src = r.panel.data;
    frozenPanel.hidden = false;
  }
}
function unfreeze() {
  if (!frozen) return;
  frozen = false;
  frozenImg.hidden = true;
  frozenImg.removeAttribute('src');
  frozenPanel.hidden = true;
  frozenPanel.removeAttribute('src');
  nq.invoke('unfreeze');
}

// ---------- menus suspensos ----------

function openPop(kind, render, anchor, { align = 'right', modal = true, width } = {}) {
  if (pop && pop.kind === kind) { closePop(); return null; }
  closePop(true, true);
  const el = document.createElement('div');
  el.className = 'pop pop-' + kind + ' ' + align;
  layer.appendChild(el);
  pop = { kind, el, render, modal, anchor, align, width };
  render(el);
  placePop();
  layer.classList.toggle('modal', modal);
  freeze();
  return el;
}
function placePop() {
  if (!pop) return;
  const r = pop.anchor.getBoundingClientRect();
  const el = pop.el;
  el.style.top = Math.round(r.bottom + 8) + 'px';
  if (pop.width) el.style.width = pop.width + 'px';
  if (pop.align === 'right') { el.style.right = Math.max(10, Math.round(innerWidth - r.right)) + 'px'; el.style.left = ''; }
  else { el.style.left = Math.round(r.left) + 'px'; el.style.right = ''; }
}
function closePop(keepFrozen, instant) {
  if (!pop) return;
  const el = pop.el;
  pop = null;
  layer.classList.remove('modal');
  if (instant) el.remove();
  else {
    el.classList.add('closing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 250);
  }
  if (!keepFrozen) setTimeout(() => { if (!pop) unfreeze(); }, instant ? 0 : 120);
}
function stagger(el) {
  el.classList.add('stagger');
  [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
}
$('#backdrop').addEventListener('mousedown', () => closePop());
addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop && pop.modal) { closePop(); nq.send('focusPage'); } });
addEventListener('resize', () => { if (pop) placePop(); scheduleLayout(); layoutBookmarks(); placeUline(false); });
addEventListener('blur', () => { if (pop && pop.modal) closePop(); });

// ---------- render principal ----------

nq.on('state', (s) => { state = s; render(); });
nq.on('downloads', (list) => { downloads = list; renderDownloadsBtn(); if (pop && pop.kind === 'dl') pop.render(pop.el); });
nq.on('metrics', (m) => { metrics = m; renderMeter(); });
// versao nova baixada: mostra o botao "Atualizar"
function renderUpdate(u) {
  const b = $('#btn-update');
  const ready = u && u.status === 'ready';
  b.hidden = !ready;
  if (ready) b.title = `Versão ${u.version} pronta. Clique para instalar e abrir de novo (leva poucos segundos).`;
}
nq.on('update', renderUpdate);
nq.invoke('update').then(renderUpdate);
$('#btn-update').addEventListener('click', () => nq.send('installUpdate'));
nq.on('find', (r) => {
  $('#find-count').textContent = `${r.active || 0}/${r.total || 0}`;
  $('#find-input').classList.toggle('none', !!$('#find-input').value && !r.total);
});
nq.on('command', (c) => {
  switch (c.cmd) {
    case 'focusAddress': address.focus(); address.select(); break;
    case 'focusFind': { const f = $('#find-input'); f.focus(); f.select(); if (f.value) nq.send('find', f.value, { newSearch: true }); break; }
    case 'findNext': if (state && state.findOpen) findStep(true); else nq.send('menu', 'find'); break;
    case 'downloadStarted': { const b = $('#btn-downloads'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); break; }
    case 'fullscreen': document.body.classList.toggle('fullscreen', c.on); break;
    case 'snapshot': if (typeof Snap !== 'undefined') Snap.open(); break;
  }
});

function render() {
  if (!state) return;
  const s = state.settings;
  const b = document.body;
  b.dataset.theme = s.theme;
  document.documentElement.style.setProperty('--accent-pick', s.accent);
  document.documentElement.style.setProperty('--accent-ink', contrastInk(s.accent));
  b.classList.toggle('private', state.private);
  b.classList.toggle('no-rail', !s.sidebar);
  b.classList.toggle('no-bookmarks', !s.bookmarksBar);
  $('#private-badge').hidden = !state.private;
  document.title = state.private ? 'Nanquim (anônima)' : 'Nanquim';
  renderTabs();
  renderNav();
  renderBookmarks();
  renderRail();
  $('#findbar').hidden = !state.findOpen;
  if (pop && pop.kind !== 'suggest') pop.render(pop.el);
  scheduleLayout();
  firstRender = false;
}

// ---------- abas ----------

const tabsEl = $('#tabs');
const newTabBtn = $('#btn-newtab');
const uline = $('#uline');
let dragId = null;

function makeTab(id) {
  const el = document.createElement('div');
  el.className = 'tab' + (firstRender ? '' : ' enter');
  el.dataset.id = id;
  el.draggable = true;
  el.innerHTML = `<span class="tab-icon"></span><span class="tab-title"></span>
    <button class="tab-audio" title="Silenciar">${icon('speaker')}</button>
    <button class="tab-close" title="Fechar aba (Ctrl+W)">${icon('close')}</button>`;
  el.addEventListener('animationend', () => { el.classList.remove('enter'); placeUline(false); });
  el.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !e.target.closest('button')) nq.send('activateTab', id);
    if (e.button === 1) e.preventDefault();
  });
  el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); nq.send('closeTab', id); } });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); nq.send('tabMenu', id); });
  el.querySelector('.tab-close').addEventListener('click', (e) => { e.stopPropagation(); nq.send('closeTab', id); });
  el.querySelector('.tab-audio').addEventListener('click', (e) => { e.stopPropagation(); nq.send('muteTab', id); });
  el.addEventListener('dragstart', (e) => {
    dragId = id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.title || '');
  });
  el.addEventListener('dragend', () => { dragId = null; el.classList.remove('dragging'); clearDropMarks(); });
  el.addEventListener('dragover', (e) => {
    if (dragId == null || dragId === id) return;
    e.preventDefault();
    clearDropMarks();
    const r = el.getBoundingClientRect();
    el.classList.add(e.clientX < r.left + r.width / 2 ? 'drop-before' : 'drop-after');
  });
  el.addEventListener('drop', (e) => {
    if (dragId == null) return;
    e.preventDefault();
    const before = el.classList.contains('drop-before');
    clearDropMarks();
    const order = state.tabs.map(t => t.id).filter(x => x !== dragId);
    nq.send('moveTab', dragId, order.indexOf(id) + (before ? 0 : 1));
  });
  return el;
}
function clearDropMarks() { tabsEl.querySelectorAll('.drop-before, .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after')); }

function updateTab(el, t) {
  el.classList.toggle('active', t.id === state.activeId);
  el.classList.toggle('pinned', !!t.pinned);
  el.classList.toggle('discarded', !!t.discarded);
  el.title = t.title + (t.discarded ? ' (dormindo)' : '');
  const title = el.querySelector('.tab-title');
  if (title.textContent !== t.title) title.textContent = t.title;
  const ic = el.querySelector('.tab-icon');
  const internal = t.url === '' || t.url.startsWith('nanquim://');
  const key = t.loading ? 'load' : internal ? 'int' : t.favicon ? 'fav:' + t.favicon : 'letter:' + letterFor(t.title, t.url);
  if (ic.dataset.key !== key) {
    ic.dataset.key = key;
    if (t.loading) ic.innerHTML = '<span class="spinner"></span>';
    else if (internal) ic.innerHTML = NQ_LOGO;
    else if (t.favicon) {
      ic.innerHTML = '';
      const img = new Image();
      if (t.faviconMono) img.className = 'mono';
      // se o icone da pagina nao carregar, tenta o icone guardado do site e, por ultimo, a letra
      let backup = t.faviconBackup;
      img.onerror = () => {
        if (backup) { const b = backup; backup = null; img.className = ''; img.src = b; return; }
        ic.innerHTML = `<span class="glyph">${esc(letterFor(t.title, t.url))}</span>`;
      };
      img.src = t.favicon;
      ic.appendChild(img);
    } else ic.innerHTML = `<span class="glyph">${esc(letterFor(t.title, t.url))}</span>`;
  }
  const audio = el.querySelector('.tab-audio');
  audio.hidden = !(t.audible || t.muted);
  audio.classList.toggle('muted', !!t.muted);
  const want = t.muted ? 'muted' : 'speaker';
  if (audio.dataset.i !== want) { audio.dataset.i = want; audio.innerHTML = icon(want); audio.title = t.muted ? 'Reativar som' : 'Silenciar'; }
}

function renderTabs() {
  const existing = new Map([...tabsEl.querySelectorAll('.tab')].map(el => [Number(el.dataset.id), el]));
  state.tabs.forEach((t, i) => {
    let el = existing.get(t.id);
    if (!el) el = makeTab(t.id);
    existing.delete(t.id);
    updateTab(el, t);
    if (tabsEl.children[i] !== el) tabsEl.insertBefore(el, tabsEl.children[i] || newTabBtn);
  });
  existing.forEach(el => el.remove());
  placeUline(true);
}

// o traco de tinta embaixo da aba ativa: escorrega ate a nova aba, esticando no caminho
let ulineFrom = null;
let ulineAnim = null;
function placeUline(animate) {
  requestAnimationFrame(() => {
    const act = tabsEl.querySelector('.tab.active');
    if (!act || act.classList.contains('pinned')) { uline.style.opacity = 0; ulineFrom = null; return; }
    const tr = tabsEl.getBoundingClientRect();
    const r = act.getBoundingClientRect();
    const to = { x: r.left - tr.left + 10, w: Math.max(8, r.width - 20), y: r.bottom - tr.top - 6 };
    uline.style.top = to.y + 'px';
    uline.style.opacity = 1;
    const tf = (p) => `translateX(${p.x}px) scaleX(${p.w / 100})`;
    if (ulineAnim) ulineAnim.cancel();
    if (animate && ulineFrom && (Math.abs(ulineFrom.x - to.x) > 2 || Math.abs(ulineFrom.w - to.w) > 2)) {
      const left = Math.min(ulineFrom.x, to.x);
      const right = Math.max(ulineFrom.x + ulineFrom.w, to.x + to.w);
      ulineAnim = uline.animate([
        { transform: tf(ulineFrom) },
        { transform: tf({ x: to.x > ulineFrom.x ? ulineFrom.x + ulineFrom.w * 0.35 : left, w: (right - left) * 0.7 }), offset: 0.45 },
        { transform: tf(to) }
      ], { duration: 420, easing: 'cubic-bezier(.45,0,.2,1)' });
    }
    uline.style.transform = tf(to);
    ulineFrom = to;
  });
}

newTabBtn.addEventListener('click', () => nq.send('newTab'));

// ---------- barra de navegacao ----------

let lastBlocked = 0;
function renderNav() {
  const n = state.nav || { url: '', canBack: false, canFwd: false };
  $('#btn-back').disabled = !n.canBack;
  $('#btn-fwd').disabled = !n.canFwd;
  const rl = $('#btn-reload');
  const want = n.loading ? 'stop' : 'reload';
  if (rl.dataset.i !== want) { rl.dataset.i = want; rl.innerHTML = icon(want); rl.title = n.loading ? 'Parar (Esc)' : 'Recarregar (F5)'; }
  $('#loadline').classList.toggle('on', !!n.loading);

  if (!editing) address.value = n.url;
  renderAddressView(n);

  const badge = $('#omni-badge');
  badge.className = 'omni-badge';
  if (n.internal || !n.url) { badge.innerHTML = icon('search'); badge.title = ''; }
  else if (n.secure) { badge.innerHTML = icon('lock'); badge.title = 'Conexão segura'; }
  else if (n.insecure) { badge.classList.add('warn'); badge.innerHTML = icon('warn') + 'Não seguro'; badge.title = 'Conexão sem criptografia'; }
  else { badge.innerHTML = icon('globe'); badge.title = ''; }

  const zc = $('#zoom-chip');
  zc.hidden = !n.zoom || n.zoom === 100;
  zc.textContent = n.zoom + '%';

  const star = $('#btn-star');
  if (star.classList.contains('on') !== !!n.bookmarked) star.classList.toggle('on', !!n.bookmarked);
  star.disabled = !n.url || !!n.internal;
  star.title = n.bookmarked ? 'Tirar dos favoritos (Ctrl+D)' : 'Favoritar (Ctrl+D)';

  const sh = $('#btn-shield');
  const off = !state.settings.adblock || n.shieldOff;
  sh.classList.toggle('off', off);
  const count = !off && n.blocked ? n.blocked : 0;
  $('#shield-count').textContent = count ? (count > 999 ? '999+' : count) : '';
  if (count > lastBlocked) { sh.classList.remove('bump'); void sh.offsetWidth; sh.classList.add('bump'); }
  lastBlocked = count;
  sh.hidden = !!n.internal || !n.url;
}

function renderAddressView(n) {
  const v = $('#address-view');
  const url = n.url || '';
  if (!url) { v.innerHTML = ''; return; }
  const m = /^(https?:\/\/)(www\.)?([^/?#]+)(.*)$/i.exec(url);
  if (m) v.innerHTML = `<span class="host">${esc(m[3])}</span>${esc(m[4] === '/' ? '' : m[4])}`;
  else v.innerHTML = `<span class="host">${esc(url)}</span>`;
}

$('#btn-back').addEventListener('click', () => nq.send('back'));
$('#btn-fwd').addEventListener('click', () => nq.send('forward'));
$('#btn-reload').addEventListener('click', (e) => {
  if (state && state.nav && state.nav.loading) nq.send('stop');
  else nq.send('reload', e.shiftKey || e.ctrlKey);
});
$('#btn-star').addEventListener('click', () => nq.send('toggleBookmark'));
$('#btn-snap').addEventListener('click', () => { if (typeof Snap !== 'undefined') Snap.open(); });
$('#zoom-chip').addEventListener('click', () => nq.send('zoom', 0));

// ---------- barra de endereco e sugestoes ----------

let sugItems = [];
let sugSel = 0;
let typed = '';
let sugTimer = null;
let sugReq = 0;

address.addEventListener('focus', () => {
  editing = true;
  omni.classList.add('focus');
  requestAnimationFrame(() => address.select());
});
address.addEventListener('blur', () => {
  editing = false;
  omni.classList.remove('focus');
  closeSuggest();
  if (state && state.nav) address.value = state.nav.url;
});
address.addEventListener('input', (e) => {
  editing = true;
  omni.classList.add('focus');
  typed = address.value.slice(0, address.selectionStart);
  const deleting = e.inputType && e.inputType.startsWith('delete');
  clearTimeout(sugTimer);
  if (!address.value.trim()) { closeSuggest(); return; }
  sugTimer = setTimeout(() => fetchSuggest(address.value, !deleting), 60);
});

async function fetchSuggest(text, allowInline) {
  const req = ++sugReq;
  const res = await nq.invoke('suggest', text);
  if (req !== sugReq || document.activeElement !== address) return;
  const q = text.trim();
  const items = [];
  items.push(looksLikeUrl(q) ? { kind: 'go', text: q, url: q } : { kind: 'search', text: q });
  for (const l of res.local) items.push({ kind: l.kind, text: l.title, url: l.url });
  for (const r of res.remote) if (r.toLowerCase() !== q.toLowerCase()) items.push({ kind: 'search', text: r });
  sugItems = items.slice(0, 9);
  sugSel = 0;
  // completa o endereco na propria barra
  if (allowInline && q && !/\s/.test(q) && address.selectionEnd === address.value.length) {
    const hit = res.local.find(l => stripUrl(l.url).toLowerCase().startsWith(q.toLowerCase()));
    if (hit) {
      const full = stripUrl(hit.url);
      const host = full.split('/')[0];
      const completion = host.toLowerCase().startsWith(q.toLowerCase()) && host.length > q.length ? host : (full.length > q.length ? full : '');
      if (completion) {
        address.value = q + completion.slice(q.length);
        address.setSelectionRange(q.length, address.value.length);
        sugItems[0] = { kind: 'go', text: completion, url: completion === full ? hit.url : completion };
      }
    }
  }
  showSuggest();
}

function showSuggest() {
  if (!sugItems.length) return closeSuggest();
  if (!pop || pop.kind !== 'suggest') {
    const el = openPop('suggest', renderSuggest, omni, { align: 'left', modal: false, width: omni.getBoundingClientRect().width });
    if (el) stagger(el);
  } else {
    pop.width = omni.getBoundingClientRect().width;
    renderSuggest(pop.el);
    placePop();
  }
}

function renderSuggest(el) {
  const q = typed.trim().toLowerCase();
  const mark = (s) => {
    const t = String(s);
    const i = q ? t.toLowerCase().indexOf(q) : -1;
    return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  };
  el.innerHTML = sugItems.map((it, i) => {
    let ic = 'search', main = '', sub = '', k = '';
    if (it.kind === 'search') { main = mark(it.text); k = 'pesquisar'; }
    else if (it.kind === 'go') { ic = 'globe'; main = esc(it.text); k = 'abrir'; }
    else { ic = it.kind === 'favorito' ? 'star' : 'clock'; main = mark(it.text || it.url); sub = mark(stripUrl(it.url)); k = it.kind; }
    return `<div class="sg${i === sugSel ? ' sel' : ''}" data-i="${i}" style="--i:${i}">${icon(ic)}<span class="t">${main}</span><span class="u">${sub}</span><span class="k">${k}</span></div>`;
  }).join('');
  el.querySelectorAll('.sg').forEach(row => {
    row.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const it = sugItems[Number(row.dataset.i)];
      go(it.url || it.text, e.button === 1 || e.ctrlKey);
    });
  });
}

function closeSuggest() {
  sugReq++;
  sugItems = [];
  if (pop && pop.kind === 'suggest') closePop(false, true);
}

function go(text, newTab) {
  if (!text || !text.trim()) return;
  closeSuggest();
  if (newTab) nq.send('newTab', text.trim());
  else nq.send('navigate', text.trim());
  editing = false;
  address.blur();
}

address.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const it = pop && pop.kind === 'suggest' && sugItems[sugSel];
    go(it && sugSel > 0 ? (it.url || it.text) : address.value, e.altKey);
  } else if (e.key === 'Escape') {
    if (pop && pop.kind === 'suggest') { closeSuggest(); address.value = typed || address.value; }
    else { address.value = state && state.nav ? state.nav.url : ''; address.blur(); nq.send('focusPage'); }
  } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && pop && pop.kind === 'suggest') {
    e.preventDefault();
    sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length;
    const it = sugItems[sugSel];
    address.value = sugSel === 0 ? typed : (it.kind === 'search' ? it.text : stripUrl(it.url));
    renderSuggest(pop.el);
  }
});

// ---------- favoritos ----------

const bmEl = $('#bookmarks');
let bmKey = '';

function renderBookmarks() {
  const list = state.bookmarks;
  const key = JSON.stringify(list) + state.settings.bookmarksBar;
  if (key === bmKey) return;
  bmKey = key;
  if (!list.length) {
    bmEl.innerHTML = '<span class="bm-empty">Seus favoritos aparecem aqui. Use a estrela ou Ctrl+D para guardar uma página.</span>';
    return;
  }
  bmEl.innerHTML = list.map(b => `<button class="bm" data-id="${b.id}" title="${esc(b.title)}\n${esc(b.url)}">${
    b.favicon ? `<img src="${esc(b.favicon)}" alt="">` : `<span class="glyph">${esc(letterFor(b.title, b.url))}</span>`
  }<span>${esc(b.title)}</span></button>`).join('') + '<button id="bm-more" hidden title="Mais favoritos">»</button>';
  bmEl.querySelectorAll('.bm').forEach(btn => {
    const b = list.find(x => x.id === Number(btn.dataset.id));
    const img = btn.querySelector('img');
    if (img) img.onerror = () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'glyph', textContent: letterFor(b.title, b.url) }));
    btn.addEventListener('click', (e) => nq.send('openUrl', b.url, e.ctrlKey || e.metaKey));
    btn.addEventListener('auxclick', (e) => { if (e.button === 1) nq.send('openUrl', b.url, true); });
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); nq.send('bookmarkMenu', b.id); });
  });
  $('#bm-more').addEventListener('click', (e) => {
    const ids = [...bmEl.querySelectorAll('.bm.hidden')].map(x => Number(x.dataset.id));
    const r = e.currentTarget.getBoundingClientRect();
    nq.send('bookmarksOverflow', ids, r.left, r.bottom);
  });
  requestAnimationFrame(layoutBookmarks);
}

function layoutBookmarks() {
  const more = $('#bm-more');
  if (!more) return;
  const items = [...bmEl.querySelectorAll('.bm')];
  items.forEach(i => i.classList.remove('hidden'));
  const limit = bmEl.clientWidth - 44;
  let hidden = 0;
  for (const it of items) if (it.offsetLeft + it.offsetWidth > limit) { it.classList.add('hidden'); hidden++; }
  more.hidden = hidden === 0;
}

// ---------- trilho lateral e paineis ----------

let railKey = '';
function panelIcon(p) {
  return p.icon ? `<img src="${esc(p.icon)}" alt="">` : `<span class="letter">${esc((p.name || '?')[0])}</span>`;
}
function renderRail() {
  const key = JSON.stringify(state.panels) + state.panelOpen;
  if (key === railKey) return;
  railKey = key;
  const box = $('#rail-panels');
  const existing = new Map([...box.children].map(el => [el.dataset.id, el]));
  state.panels.forEach((p, i) => {
    let btn = existing.get(p.id);
    existing.delete(p.id);
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'panel-btn';
      btn.dataset.id = p.id;
      btn.innerHTML = `<span class="pi"></span><svg class="ring" viewBox="0 0 54 54"><path d="${RING_D}" fill="var(--accent)" filter="url(#rough)"/></svg><span class="live" hidden></span>`;
      btn.addEventListener('click', () => nq.send('panelToggle', btn.dataset.id));
      btn.addEventListener('contextmenu', (e) => { e.preventDefault(); nq.send('panelMenu', btn.dataset.id); });
    }
    const pi = btn.querySelector('.pi');
    const iconKey = p.icon ? p.icon.length + p.icon.slice(-20) : 'l' + p.name;
    if (pi.dataset.k !== iconKey) {
      pi.dataset.k = iconKey;
      pi.innerHTML = panelIcon(p);
      const img = pi.querySelector('img');
      if (img) img.onerror = () => { pi.innerHTML = `<span class="letter">${esc(p.name[0])}</span>`; };
    }
    btn.classList.toggle('open', p.id === state.panelOpen);
    btn.classList.toggle('loaded', p.loaded);
    btn.querySelector('.live').hidden = !p.loaded || p.id === state.panelOpen;
    btn.title = p.name + ' (clique direito para mais opções)';
    if (box.children[i] !== btn) box.insertBefore(btn, box.children[i] || null);
  });
  existing.forEach(el => el.remove());
}
$('#rail-add').addEventListener('click', () => nq.send('openInternal', 'settings', 'paineis'));
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => nq.send('openInternal', b.dataset.open)));

function renderMeter() {
  $('#meter-ram').textContent = metrics.ram;
  const cap = metrics.limit > 0 ? metrics.limit : 4096;
  $('#meter .mbar i').style.height = Math.min(100, (metrics.ram / cap) * 100) + '%';
  $('#meter').classList.toggle('hot', metrics.limit > 0 && metrics.ram > metrics.limit * 0.9);
  $('#meter').title = `Memória: ${metrics.ram} MB${metrics.limit ? ' de ' + metrics.limit + ' MB (limite)' : ''}\nProcessador: ${metrics.cpu}%`;
}

// ---------- localizar ----------

const findInput = $('#find-input');
findInput.addEventListener('input', () => nq.send('find', findInput.value, { newSearch: true }));
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); findStep(!e.shiftKey); }
  if (e.key === 'Escape') { e.preventDefault(); nq.send('findClose'); }
});
function findStep(forward) { if (findInput.value) nq.send('find', findInput.value, { forward, newSearch: false }); }
$('#find-next').addEventListener('click', () => findStep(true));
$('#find-prev').addEventListener('click', () => findStep(false));
$('#find-close').addEventListener('click', () => nq.send('findClose'));

// ---------- menu principal ----------

function renderMenu(el) {
  const z = state && state.nav ? state.nav.zoom : 100;
  const item = (act, ic, label, kbd) => `<button class="mi" data-act="${act}">${icon(ic)}<span>${label}</span>${kbd ? `<kbd>${kbd}</kbd>` : ''}</button>`;
  el.innerHTML = `
    ${item('newTab', 'plus', 'Nova aba', 'Ctrl T')}
    ${item('newWindow', 'window', 'Nova janela', 'Ctrl N')}
    ${item('privateWindow', 'mask', 'Janela anônima', 'Ctrl ⇧ N')}
    <div class="pop-sep"></div>
    <div class="zoom-row"><span>Zoom</span>
      <button data-act="zoomOut" title="Diminuir (Ctrl -)">${icon('minus')}</button>
      <span class="zv">${z}%</span>
      <button data-act="zoomIn" title="Aumentar (Ctrl +)">${icon('plus')}</button>
      <button data-act="fullscreen" title="Tela cheia (F11)">${icon('fullscreen')}</button>
    </div>
    <div class="pop-sep"></div>
    ${item('history', 'clock', 'Histórico', 'Ctrl H')}
    ${item('downloads', 'download', 'Downloads', 'Ctrl J')}
    ${item('bookmarks', 'bookmark', 'Favoritos', 'Ctrl ⇧ O')}
    ${item('reopen', 'undo', 'Reabrir aba fechada', 'Ctrl ⇧ T')}
    <div class="pop-sep"></div>
    ${item('snapshot', 'camera', 'Tirar print', 'Ctrl ⇧ 5')}
    ${item('find', 'search', 'Procurar na página', 'Ctrl F')}
    ${item('print', 'printer', 'Imprimir', 'Ctrl P')}
    ${item('savePage', 'save', 'Salvar página', 'Ctrl S')}
    ${item('devtools', 'code', 'Ferramentas do desenvolvedor', 'F12')}
    <div class="pop-sep"></div>
    ${item('settings', 'sliders', 'Configurações', 'Ctrl ,')}
    ${state && state.lockOn ? item('lock', 'lock', 'Bloquear agora', 'Ctrl ⇧ L') : ''}
    ${item('quit', 'exit', 'Sair', '')}
    <div class="pop-sep"></div>
    <div class="mfoot"><span>${metrics.ram} MB · ${metrics.cpu}% cpu</span><b>${metrics.blocked || 0} bloqueados</b></div>`;
  el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'zoomIn') return nq.send('zoom', 1);
    if (a === 'zoomOut') return nq.send('zoom', -1);
    closePop();
    if (a === 'newTab') nq.send('newTab');
    else nq.send('menu', a);
  }));
}
$('#btn-menu').addEventListener('click', (e) => { const el = openPop('menu', renderMenu, e.currentTarget); if (el) stagger(el); });

// ---------- bloqueador ----------

function renderShield(el) {
  const n = state.nav || {};
  const on = state.settings.adblock && !n.shieldOff;
  el.innerHTML = `
    <h4>Bloqueador <small>${state.settings.adblock ? 'ligado' : 'desligado'}</small></h4>
    <div class="shield-site">${esc(hostOf(n.url) || n.url || '')}</div>
    <div class="big-count"><b>${on ? (n.blocked || 0) : 0}</b><span>anúncios e rastreadores barrados nesta página</span></div>
    <div class="toggle-row"><span>Bloquear neste site</span><button class="switch${on ? ' on' : ''}" id="shield-switch" ${state.settings.adblock ? '' : 'disabled'}></button></div>
    <button class="pop-link" id="shield-settings">Ajustes do bloqueador</button>`;
  el.querySelector('#shield-switch').addEventListener('click', () => nq.send('shieldToggle'));
  el.querySelector('#shield-settings').addEventListener('click', () => { closePop(); nq.send('openInternal', 'settings', 'privacidade'); });
}
$('#btn-shield').addEventListener('click', (e) => { const el = openPop('shield', renderShield, e.currentTarget); if (el) stagger(el); });

// ---------- downloads ----------

function dlMeta(d) {
  if (d.state === 'progressing') {
    if (d.paused) return `Pausado, ${fmtBytes(d.received)} de ${fmtBytes(d.total)}`;
    const left = d.total && d.speed ? Math.round((d.total - d.received) / d.speed) : null;
    const time = left == null ? '' : left > 90 ? `, faltam ${Math.round(left / 60)} min` : `, faltam ${left} s`;
    return `${fmtBytes(d.received)} de ${d.total ? fmtBytes(d.total) : '?'} · ${fmtBytes(d.speed)}/s${time}`;
  }
  if (d.state === 'completed') return d.exists === false ? 'Arquivo apagado ou movido' : fmtBytes(d.total || d.received);
  if (d.state === 'cancelled') return 'Cancelado';
  return 'Falhou';
}

function renderDl(el) {
  const list = downloads.slice(0, 6);
  const active = downloads.filter(d => d.state === 'progressing').length;
  el.innerHTML = `<h4>Downloads <small>${active ? active + ' baixando' : 'nada baixando agora'}</small></h4>` +
    (list.length ? list.map(d => {
      const ext = (d.filename.split('.').pop() || '').slice(0, 4);
      const pct = d.total ? Math.min(100, d.received / d.total * 100) : 0;
      const cls = d.state === 'completed' ? 'done' : (d.state === 'cancelled' || d.state === 'interrupted') ? 'bad' : '';
      let actions = '';
      if (d.state === 'progressing') actions = `<button class="icon-btn small" data-a="${d.paused ? 'resume' : 'pause'}" title="${d.paused ? 'Continuar' : 'Pausar'}">${icon(d.paused ? 'play' : 'pause')}</button><button class="icon-btn small" data-a="cancel" title="Cancelar">${icon('close')}</button>`;
      else if (d.state === 'completed') actions = `<button class="icon-btn small" data-a="show" title="Mostrar na pasta">${icon('folder')}</button>`;
      else actions = `<button class="icon-btn small" data-a="retry" title="Tentar de novo">${icon('retry')}</button>`;
      return `<div class="dl ${cls}" data-id="${d.id}"><span class="dl-ext">${esc(ext)}</span><span class="dl-name" title="${esc(d.filename)}">${esc(d.filename)}</span><span class="dl-actions">${actions}</span>${
        d.state === 'progressing' ? `<span class="dl-bar"><i style="width:${pct}%"></i></span><span class="dl-meta">${esc(dlMeta(d))}</span>` : `<span class="dl-meta">${esc(dlMeta(d))}</span>`}</div>`;
    }).join('') : '<div class="dl-empty">Nada baixado ainda.</div>') +
    `<div class="pop-foot"><button data-foot="all">Ver todos</button><button data-foot="folder">Abrir pasta</button></div>`;
  el.querySelectorAll('.dl').forEach(row => {
    const id = Number(row.dataset.id);
    row.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => nq.send('downloadAction', id, b.dataset.a)));
    if (row.classList.contains('done')) row.querySelector('.dl-name').addEventListener('click', () => { nq.send('downloadAction', id, 'open'); closePop(); });
  });
  el.querySelector('[data-foot="all"]').addEventListener('click', () => { closePop(); nq.send('openInternal', 'downloads'); });
  el.querySelector('[data-foot="folder"]').addEventListener('click', () => {
    const d = downloads.find(x => x.state === 'completed');
    if (d) nq.send('downloadAction', d.id, 'show'); else nq.send('openInternal', 'downloads');
    closePop();
  });
}
$('#btn-downloads').addEventListener('click', async (e) => {
  const anchor = e.currentTarget;
  if (pop && pop.kind === 'dl') return closePop();
  downloads = await nq.invoke('downloads');
  openPop('dl', renderDl, anchor);
});

function renderDownloadsBtn() {
  const active = downloads.filter(d => d.state === 'progressing');
  const ring = $('#btn-downloads .ring');
  ring.hidden = !active.length;
  if (active.length) {
    const tot = active.reduce((a, d) => a + (d.total || 0), 0);
    const rec = active.reduce((a, d) => a + (d.received || 0), 0);
    ring.querySelector('circle').style.strokeDasharray = `${tot ? Math.max(4, Math.round(rec / tot * 100)) : 15} 100`;
  }
}

// ---------- layout: avisa o processo principal onde desenhar as paginas ----------

let layoutQueued = false;
function scheduleLayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    const v = viewport.getBoundingClientRect();
    nq.send('layout', {
      vw: innerWidth, vh: innerHeight,
      view: { x: v.x, y: v.y, width: v.width, height: v.height },
      panel: null
    });
  });
}
new ResizeObserver(() => { scheduleLayout(); layoutBookmarks(); }).observe(viewport);
new ResizeObserver(() => { layoutBookmarks(); placeUline(false); }).observe(tabsEl);

viewport.addEventListener('mousedown', () => { if (pop) closePop(); address.blur(); });

nq.invoke('state').then(s => { if (s) { state = s; render(); } });
nq.invoke('downloads').then(d => { downloads = d || []; renderDownloadsBtn(); });
