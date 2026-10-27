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

// ---------- senhas: oferecer para salvar e preencher logins ----------
// Roda num mundo separado do da pagina: os scripts do site nao enxergam este codigo, a lista de contas
// (fica numa raiz de sombra fechada) nem a senha antes de voce clicar numa conta.
if (/^https?:$/.test(location.protocol)) {
  try { setupPasswords(); } catch { /* nunca atrapalha a pagina */ }
}

function setupPasswords() {
  const valueProp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const getVal = (el) => valueProp.get.call(el) || '';
  const setVal = (el, v) => {
    el.focus();
    valueProp.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const isInput = (el) => el instanceof HTMLInputElement;
  const isPw = (el) => isInput(el) && el.type === 'password';
  const isTexty = (el) => isInput(el) && /^(text|email|tel|)$/i.test(el.type);
  const USERISH = /user|usu[aá]rio|e-?mail|login|conta|account|cpf|celular|phone|telefone|ident/i;
  const looksUser = (el) => {
    if (!isTexty(el)) return false;
    if (/username|email/i.test(el.autocomplete || '') || el.type === 'email') return true;
    return USERISH.test([el.name, el.id, el.placeholder, el.getAttribute('aria-label')].join(' '));
  };
  const looksEmail = (el) => isTexty(el) && (el.type === 'email' || /email/i.test(el.autocomplete || '') || /e-?mail/i.test([el.name, el.id, el.placeholder].join(' ')));
  const pwsIn = (scope) => [...(scope && scope.querySelectorAll ? scope : document).querySelectorAll('input[type=password]')];
  const scopeOf = (el) => (el && (el.form || (el.closest && el.closest('form')))) || document;

  // campo do usuario de um campo de senha: o que o site marca como usuario, senao o ultimo campo de texto antes dela
  function userFieldFor(pw, needValue) {
    const inputs = [...scopeOf(pw).querySelectorAll('input')].filter(isTexty);
    const marked = inputs.find(i => /username|email/i.test(i.autocomplete || '') && (!needValue || getVal(i)));
    if (marked && (isVisible(marked) || getVal(marked))) return marked;
    let before = null;
    for (const i of inputs) {
      if ((i.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING) && isVisible(i) && (!needValue || getVal(i))) before = i;
    }
    return before || inputs.find(i => looksUser(i) && isVisible(i) && (!needValue || getVal(i))) || null;
  }

  // ---- envio de login ----
  let lastSig = '';
  function capture(scope) {
    const filled = pwsIn(scope).filter(p => getVal(p));
    if (!filled.length) return;
    // cadastro (senha + repetir): a primeira; trocar senha (atual, nova, repetir): a nova
    const pw = filled.length >= 3 ? filled[1] : filled[0];
    const user = userFieldFor(pw, true);
    const payload = { username: user ? getVal(user).trim() : '', password: getVal(pw) };
    const sig = payload.username + '\u0000' + payload.password;
    if (sig === lastSig) return;
    lastSig = sig;
    ipcRenderer.send('pw:submit', payload);
    // em sites que nao mudam de pagina, o login deu certo quando o campo de senha some
    let n = 0;
    const t = setInterval(() => {
      n++;
      if (!isVisible(pw)) { clearInterval(t); ipcRenderer.send('pw:gone'); } else if (n > 40) clearInterval(t);
    }, 500);
  }
  document.addEventListener('submit', (e) => capture(e.target), true);
  document.addEventListener('click', (e) => {
    if (!e.isTrusted || !e.target.closest) return;
    const b = e.target.closest('button, input[type=submit], input[type=button], input[type=image], [role=button], a');
    if (!b) return;
    const scope = scopeOf(b);
    if (pwsIn(scope).some(p => getVal(p))) capture(scope);
    else if (scope !== document && pwsIn(document).some(p => getVal(p))) capture(document);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!e.isTrusted || e.key !== 'Enter' || !isInput(e.target)) return;
    const scope = scopeOf(e.target);
    if (pwsIn(scope).some(p => getVal(p))) capture(scope);
  }, true);
  // login em duas etapas (e-mail numa tela, senha na outra): lembra o e-mail digitado
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!e.isTrusted || !looksUser(el) || pwsIn(scopeOf(el)).some(isVisible)) return;
    const v = getVal(el).trim();
    if (v) ipcRenderer.send('pw:user', v);
  }, true);

  // ---- lista de contas salvas ao clicar no campo ----
  let ui = null, target = null, list = [], sel = -1, kind = null, quietUntil = 0;
  function buildUi(theme) {
    const host = document.createElement('nanquim-senhas');
    host.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>
      .box { position: fixed; min-width: 250px; max-width: 360px; box-sizing: border-box; padding: 6px; border-radius: 12px;
        font: 13px/1.35 "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; user-select: none;
        background: var(--bg); color: var(--text); border: 1px solid var(--line); box-shadow: 0 14px 36px rgba(0,0,0,.35);
        opacity: 0; transform: translateY(-4px); transition: opacity .14s, transform .18s cubic-bezier(.2,.7,.25,1); }
      .box.on { opacity: 1; transform: none; }
      .box[hidden] { display: none; }
      .it { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 8px; cursor: default; }
      .it:hover, .it.sel { background: var(--s1); }
      .av { width: 26px; height: 26px; flex: none; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: #fff; font-weight: 600; font-size: 12px; }
      .tx { min-width: 0; display: flex; flex-direction: column; }
      .u { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .h { color: var(--muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ft { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 4px; padding: 7px 9px 3px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11.5px; }
      .ft b { font-weight: 600; color: var(--text); }
      .ft span[role=button] { color: var(--accent); cursor: pointer; }
    </style><div class="box" hidden></div>`;
    (document.documentElement || document.body).appendChild(host);
    return { host, box: root.querySelector('.box') };
  }
  function paint(theme, accent) {
    const dark = theme !== 'papel';
    const v = dark
      ? { bg: '#1d1a17', text: '#ebe3d3', muted: '#9a9286', line: '#332e28', s1: '#2a2621' }
      : { bg: '#fbf8f2', text: '#1d1a16', muted: '#6f675b', line: '#ddd4c3', s1: '#efe8da' };
    for (const [k, val] of Object.entries(v)) ui.box.style.setProperty('--' + k, val);
    ui.box.style.setProperty('--accent', accent || '#e0452b');
  }
  function place() {
    if (!ui || !target || ui.box.hidden) return;
    const r = target.getBoundingClientRect();
    const w = Math.max(250, Math.min(360, r.width));
    const below = r.bottom + 6 + ui.box.offsetHeight < innerHeight;
    ui.box.style.left = Math.max(6, Math.min(r.left, innerWidth - w - 6)) + 'px';
    ui.box.style.top = (below ? r.bottom + 6 : Math.max(6, r.top - 6 - ui.box.offsetHeight)) + 'px';
    ui.box.style.width = w + 'px';
  }
  function hide() {
    if (!ui) return;
    ui.box.classList.remove('on');
    ui.box.hidden = true;
    target = null; list = []; sel = -1;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function show(el, r) {
    if (!ui) ui = buildUi();
    paint(r.theme, r.accent);
    target = el; list = r.items; kind = r.kind; sel = -1;
    const rows = list.map((it, i) => {
      const name = it.username || '(sem usuário)';
      const sub = kind === 'login' ? r.host + ' · senha salva' : 'e-mail salvo no Nanquim';
      return `<div class="it" data-i="${i}"><span class="av">${esc((name[0] || '?').toUpperCase())}</span><span class="tx"><span class="u">${esc(name)}</span><span class="h">${esc(sub)}</span></span></div>`;
    }).join('');
    ui.box.innerHTML = rows + `<div class="ft"><span><b>Nanquim</b> · senhas salvas</span><span role="button" data-manage>Gerenciar</span></div>`;
    ui.box.hidden = false;
    place();
    requestAnimationFrame(() => ui.box.classList.add('on'));
    ui.box.onmousedown = (e) => {
      e.preventDefault();
      if (!e.isTrusted) return;
      if (e.target.closest('[data-manage]')) { hide(); ipcRenderer.send('pw:manage'); return; }
      const row = e.target.closest('.it');
      if (row) choose(Number(row.dataset.i));
    };
  }
  function mark(i) {
    sel = i;
    ui.box.querySelectorAll('.it').forEach((x, k) => x.classList.toggle('sel', k === i));
  }
  async function choose(i) {
    const it = list[i];
    const el = target;
    hide();
    if (!it || !el) return;
    if (kind === 'email') { quietUntil = Date.now() + 1500; setVal(el, it.username); return; }
    const r = await ipcRenderer.invoke('pw:fill', it.id);
    if (!r) return;
    let pw = isPw(el) ? el : pwsIn(scopeOf(el)).find(isVisible) || pwsIn(document).find(isVisible) || null;
    let user = isPw(el) ? userFieldFor(el, false) : (looksUser(el) || isTexty(el) ? el : null);
    // logo depois de preencher, a lista nao abre de novo (senao cobre o botao de entrar)
    quietUntil = Date.now() + 1500;
    if (user && r.username) setVal(user, r.username);
    if (pw) setVal(pw, r.password);
    (pw || user || el).focus();
  }
  async function offer(el, force) {
    if (!isInput(el) || el.readOnly || el.disabled) return;
    if (!force && Date.now() < quietUntil) return;
    const pwField = isPw(el);
    if (!pwField && !looksUser(el)) return;
    const r = await ipcRenderer.invoke('pw:suggest', { email: looksEmail(el), password: pwField });
    if (!r || !r.items || !r.items.length || document.activeElement !== el) return;
    // no campo de e-mail de um site sem conta salva, so sugere se ele estiver vazio ou comecando
    show(el, r);
  }
  document.addEventListener('focusin', (e) => { if (e.isTrusted) offer(e.target); }, true);
  document.addEventListener('mousedown', (e) => { if (e.isTrusted && e.target === document.activeElement && (!ui || ui.box.hidden)) offer(e.target, true); }, true);
  document.addEventListener('focusout', () => setTimeout(() => { if (target && document.activeElement !== target) hide(); }, 120), true);
  document.addEventListener('input', (e) => { if (e.isTrusted && target && e.target === target && getVal(target)) hide(); }, true);
  document.addEventListener('keydown', (e) => {
    if (!ui || ui.box.hidden || e.target !== target || !e.isTrusted) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); mark((sel + 1) % list.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark((sel - 1 + list.length) % list.length); }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); e.stopPropagation(); choose(sel); }
    else if (e.key === 'Escape') hide();
  }, true);
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
}
