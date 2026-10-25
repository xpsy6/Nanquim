// Base compartilhada pelas paginas internas do Nanquim.
'use strict';

const NQ = window.nanquim;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  retry: '<path d="M19.5 13A7.5 7.5 0 1 1 17.3 6.7"/><path d="M19.5 3.5v5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function letterFor(title, url) { return ((hostOf(url) || title || '?').replace(/[^a-z0-9]/gi, '')[0] || '?').toUpperCase(); }
function faviconUrl(url) { const h = hostOf(url); return h ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64` : ''; }
function fmtBytes(n) {
  if (!n || n < 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)).toString().replace('.', ',') + ' ' + u[i];
}
function contrastInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#111111' : '#ffffff';
}
function favImg(url, title, cls = 'fav') {
  // icone oficial embutido quando o site e conhecido; senao, o icone do proprio site
  const host = hostOf(url);
  const brand = SETTINGS && SETTINGS.brandIcons && (SETTINGS.brandIcons[host] || SETTINGS.brandIcons[host.split('.').slice(-2).join('.')]);
  if (brand) {
    const dark = SETTINGS.darkBrands && SETTINGS.darkBrands.includes(brand);
    return `<span class="${cls}"><img src="${brand}" alt=""${dark ? ' class="mono"' : ''}></span>`;
  }
  const f = faviconUrl(url);
  const l = esc(letterFor(title, url));
  return f ? `<span class="${cls}"><img src="${esc(f)}" alt="" data-fb="${l}"></span>` : `<span class="${cls}"><b>${l}</b></span>`;
}
// troca icones que nao carregaram pela letra do site
function hydrateFavs(root = document) {
  $$('img[data-fb]', root).forEach(img => {
    const fail = () => { const b = document.createElement('b'); b.textContent = img.dataset.fb; img.replaceWith(b); };
    if (img.complete && img.naturalWidth === 0) fail(); else img.addEventListener('error', fail, { once: true });
  });
}

let SETTINGS = null;
const settingsListeners = [];
function applySettings(s) {
  SETTINGS = s;
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.style.setProperty('--accent-pick', s.accent);
  // a combinacao "Tinta" usa a propria cor do texto, que muda com o tema
  root.style.setProperty('--enso-pick', (s.enso || s.accent).toLowerCase() === '#ebe3d3' ? 'var(--text)' : (s.enso || s.accent));
  root.style.setProperty('--accent-ink', contrastInk(s.accent));
  settingsListeners.forEach(fn => fn(s));
}
function onSettings(fn) { settingsListeners.push(fn); if (SETTINGS) fn(SETTINGS); }

if (NQ) {
  NQ.api('settings').then(applySettings);
  NQ.on('settings', applySettings);
}

// abre links internos respeitando Ctrl e botao do meio
function bindOpen(el, url) {
  el.addEventListener('click', (e) => { e.preventDefault(); NQ.open(url, e.ctrlKey || e.metaKey); });
  el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); NQ.open(url, true); } });
}

function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
}

// ---------- enso: circulo zen feito de fios de pincel que seguem a curva ----------
function bristleEnso(cx, cy, R, a0, sweep, wMax, B, seed) {
  const r = (k) => { const x = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  const width = (p) => wMax * (0.5 + 0.5 * Math.sin(Math.min(1, p * 5) * Math.PI / 2)) * (1 - Math.pow(p, 3) * 0.55) * (1 + 0.06 * Math.sin(p * 19 + seed));
  const rad = (p) => R + 3.5 * Math.sin(p * 4.7 + seed) + 1.5 * Math.sin(p * 11) + 5 * p;
  let d = '';
  for (let j = 0; j < B; j++) {
    const off = (j + 0.5) / B - 0.5, edge = Math.abs(off) * 2;
    const end = 1 - Math.pow(r(j + 1), 1.4) * (0.08 + edge * 0.22);
    const start = edge > 0.8 ? 0.02 + r(j + 9) * 0.04 : 0;
    const gapAt = r(j + 21), gapLen = edge > 0.5 ? r(j + 33) * 0.05 : 0;
    for (const [s0, s1] of [[start, Math.min(end, gapAt)], [Math.min(end, gapAt + gapLen), end]]) {
      if (s1 - s0 < 0.01) continue;
      const out = [], inn = [], N = 150;
      for (let i = 0; i <= N; i++) {
        const p = s0 + (s1 - s0) * i / N, a = (a0 + sweep * p) * Math.PI / 180, w = width(p);
        const bw = w / B * 1.7 * Math.max(0.15, Math.min(1, (s1 - p) / 0.04)) * (0.8 + 0.4 * r(j + 50));
        const rr = rad(p) + off * w + (r(j + 70) - 0.5) * 1.2;
        out.push([cx + Math.cos(a) * (rr + bw / 2), cy + Math.sin(a) * (rr + bw / 2)]);
        inn.push([cx + Math.cos(a) * (rr - bw / 2), cy + Math.sin(a) * (rr - bw / 2)]);
      }
      d += 'M' + out.concat(inn.reverse()).map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z ';
    }
  }
  return d;
}
// desenha um enso num svg de 380x380; com paint=true ele e pintado com animacao
function drawEnso(svg, { paint = false, seed = 3 } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'm' + Math.random().toString(36).slice(2, 8);
  const R = 162, cx = 190, cy = 190, a0 = -66 * Math.PI / 180, a1 = (-66 + 334) * Math.PI / 180, m = (a0 + a1) / 2;
  const P = (a) => `${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}`;
  svg.setAttribute('viewBox', '0 0 380 380');
  svg.innerHTML = `<defs>
      <filter id="${id}r" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G"/></filter>
      <mask id="${id}m" maskUnits="userSpaceOnUse"><path class="enso-mask" d="M ${P(a0)} A ${R} ${R} 0 0 1 ${P(m)} A ${R} ${R} 0 0 1 ${P(a1)}" fill="none" stroke="#fff" stroke-width="80" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${paint ? 1 : 0}"/></mask>
    </defs>
    <g filter="url(#${id}r)" mask="url(#${id}m)"><path d="${bristleEnso(190, 190, 158, -62, 318, 32, 26, seed)}" fill="var(--enso)"/></g>`;
  if (paint) {
    const mp = svg.querySelector('.enso-mask');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) mp.setAttribute('stroke-dashoffset', '0');
    else mp.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1300, easing: 'cubic-bezier(.55,.05,.35,1)', fill: 'forwards', delay: 80 });
  }
}
