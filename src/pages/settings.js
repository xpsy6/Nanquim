'use strict';

// combinacoes prontas: [cor do circulo, cor dos detalhes]
const PRESETS = [
  { name: 'Vermelho', enso: '#e0452b', accent: '#e0452b' },
  { name: 'Roxo', enso: '#a768c4', accent: '#a768c4' },
  { name: 'Roxo e vermelho', enso: '#a768c4', accent: '#e0452b' },
  { name: 'Azul', enso: '#5b8bd6', accent: '#5b8bd6' },
  { name: 'Verde', enso: '#7fa35b', accent: '#7fa35b' },
  { name: 'Dourado', enso: '#c9a24a', accent: '#c9a24a' },
  { name: 'Tinta', enso: '#ebe3d3', accent: '#e0452b' }
];
const PERM_NAMES = { media: 'Câmera e microfone', geolocation: 'Localização', notifications: 'Notificações', midiSysex: 'MIDI', 'idle-detection': 'Detecção de inatividade' };

let S = null;
const set = (key, value) => NQ.api('setSetting', { key, value });

// ---------- navegacao lateral ----------
const links = $$('.side a');
function markNav() {
  let current = 'aparencia';
  for (const sec of $$('section')) if (sec.getBoundingClientRect().top < 140) current = sec.id;
  links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + current));
}
addEventListener('scroll', markNav, { passive: true });
function goHash() {
  const id = location.hash.slice(1);
  const el = id && document.getElementById(id);
  if (el) el.scrollIntoView();
  markNav();
}
addEventListener('hashchange', goHash);

// ---------- controles simples ----------
$$('[data-bool]').forEach(b => b.addEventListener('click', () => set(b.dataset.bool, !S[b.dataset.bool])));
$$('[data-num]').forEach(sel => sel.addEventListener('change', () => set(sel.dataset.num, Number(sel.value))));
$$('[data-theme-pick]').forEach(b => b.addEventListener('click', () => set('theme', b.dataset.themePick)));
$$('input[name="startup"]').forEach(r => r.addEventListener('change', () => set('startup', r.value)));
$('#homepage').addEventListener('change', (e) => {
  let v = e.target.value.trim() || 'nanquim://newtab';
  if (!/^[a-z]+:\/\//i.test(v)) v = 'https://' + v;
  set('homepage', v);
  toast('Página inicial salva');
});
$('#home-newtab').addEventListener('click', () => set('homepage', 'nanquim://newtab'));
// seletores de cor: mostram a cor na hora e salvam quando voce solta
for (const [id, key, cssVar] of [['#pick-enso', 'enso', '--enso-pick'], ['#pick-accent', 'accent', '--accent-pick']]) {
  const inp = $(id);
  // aplica no navegador inteiro enquanto voce escolhe, sem esperar fechar a janelinha de cor
  let timer = null;
  inp.addEventListener('input', () => {
    document.documentElement.style.setProperty(cssVar, inp.value);
    clearTimeout(timer);
    timer = setTimeout(() => set(key, inp.value), 120);
  });
  inp.addEventListener('change', () => { clearTimeout(timer); set(key, inp.value); });
}
drawEnso($('#mini-enso'), { paint: true, seed: 3 });

function renderAll(s) {
  S = s;
  $$('[data-bool]').forEach(b => b.classList.toggle('on', !!s[b.dataset.bool]));
  $$('[data-num]').forEach(sel => {
    const v = String(s[sel.dataset.num]);
    // largura escolhida arrastando a borda do painel aparece como "Personalizada"
    let custom = sel.querySelector('option[data-custom]');
    if (![...sel.options].some(o => o.value === v && !o.dataset.custom)) {
      if (!custom) { custom = document.createElement('option'); custom.dataset.custom = '1'; sel.appendChild(custom); }
      custom.value = v;
      custom.textContent = `Personalizada (${v} px)`;
    } else if (custom) custom.remove();
    sel.value = v;
  });
  $$('[data-theme-pick]').forEach(b => b.classList.toggle('on', b.dataset.themePick === s.theme));
  $$('input[name="startup"]').forEach(r => { r.checked = r.value === s.startup; });
  if (document.activeElement !== $('#homepage')) $('#homepage').value = s.homepage;

  // cores
  const pr = $('#presets');
  const same = (x, y) => (x || '').toLowerCase() === (y || '').toLowerCase();
  pr.innerHTML = PRESETS.map((p, i) => `<button class="preset${same(p.enso, s.enso) && same(p.accent, s.accent) ? ' on' : ''}" data-p="${i}"><span class="dots"><i style="background:${p.enso}"></i><i style="background:${p.accent}"></i></span>${esc(p.name)}</button>`).join('');
  $$('.preset', pr).forEach(b => b.addEventListener('click', async () => {
    const p = PRESETS[Number(b.dataset.p)];
    await set('enso', p.enso);
    await set('accent', p.accent);
    drawEnso($('#mini-enso'), { paint: true, seed: 3 });
  }));
  if (document.activeElement !== $('#pick-enso')) $('#pick-enso').value = s.enso || s.accent;
  if (document.activeElement !== $('#pick-accent')) $('#pick-accent').value = s.accent;
  $$('[data-theme-pick] .preview u').forEach(u => { u.style.borderColor = 'var(--enso)'; });

  // buscadores
  const eng = $('#engines');
  eng.innerHTML = Object.entries(s.searchEngines).map(([id, e]) => `<button class="engine${id === s.searchEngine ? ' on' : ''}" data-e="${id}">${esc(e.name)}</button>`).join('');
  $$('.engine', eng).forEach(b => b.addEventListener('click', () => set('searchEngine', b.dataset.e)));

  // sites liberados
  const al = $('#allow-list');
  al.innerHTML = s.adblockAllow.length
    ? s.adblockAllow.map(site => `<span class="chip">${esc(site)}<button class="icon-btn" data-site="${esc(site)}" title="Voltar a bloquear">${icon('close')}</button></span>`).join('')
    : '<span class="none">Nenhum. Use o escudo na barra de endereço para liberar um site.</span>';
  $$('[data-site]', al).forEach(b => b.addEventListener('click', () => set('adblockAllow', S.adblockAllow.filter(x => x !== b.dataset.site))));

  // paineis
  const pn = $('#panels');
  const defaults = ['whatsapp', 'instagram', 'discord', 'spotify', 'telegram', 'ytmusic'];
  pn.innerHTML = s.panels.map((p, i) => `<div class="panel-row">
      <span class="st">${p.icon ? `<img src="${esc(p.icon)}" alt="">` : esc(p.name[0])}</span>
      <span class="n"><b>${esc(p.name)}</b><small>${esc(p.url)}</small></span>
      ${defaults.includes(p.id) ? '' : `<button class="icon-btn danger" data-rm="${i}" title="Remover">${icon('trash')}</button>`}
      <button class="switch${p.enabled ? ' on' : ''}" data-pi="${i}"></button>
    </div>`).join('');
  $$('[data-pi]', pn).forEach(b => b.addEventListener('click', () => {
    const panels = S.panels.map(x => ({ ...x }));
    panels[Number(b.dataset.pi)].enabled = !panels[Number(b.dataset.pi)].enabled;
    set('panels', panels);
  }));
  $$('[data-rm]', pn).forEach(b => b.addEventListener('click', () => set('panels', S.panels.filter((_, i) => i !== Number(b.dataset.rm)))));

  $('#dl-dir').textContent = s.downloadDir || '(pasta Downloads do sistema)';
  refreshInfo();
}
onSettings(renderAll);

$('#panel-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#p-name').value.trim();
  let url = $('#p-url').value.trim();
  if (!name || !url) return;
  if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
  const id = 'custom-' + Date.now();
  set('panels', [...S.panels, { id, name, short: name.slice(0, 2).toUpperCase(), url, enabled: true }]);
  e.target.reset();
  toast('Painel adicionado na barra lateral');
});

// ---------- limpar dados ----------
$('#c-go').addEventListener('click', async () => {
  const range = Number($('#c-range').value);
  const opts = {
    history: $('#c-history').checked,
    cookies: $('#c-cookies').checked,
    cache: $('#c-cache').checked,
    downloads: $('#c-downloads').checked,
    since: range ? Date.now() - range : 0
  };
  if (!opts.history && !opts.cookies && !opts.cache && !opts.downloads) return toast('Marque pelo menos uma opção');
  $('#c-go').disabled = true;
  await NQ.api('clearData', opts);
  $('#c-go').disabled = false;
  toast('Dados apagados');
});

// ---------- permissoes ----------
async function renderPerms() {
  const p = await NQ.api('permissions');
  const rows = [];
  for (const [origin, perms] of Object.entries(p)) for (const [perm, val] of Object.entries(perms)) rows.push({ origin, perm, val });
  const box = $('#perms');
  box.innerHTML = rows.length ? rows.map((r, i) => `<div class="prow">
      <span class="o">${esc(r.origin.replace(/^https?:\/\//, ''))}</span>
      <span class="p">${esc(PERM_NAMES[r.perm] || r.perm)}</span>
      <span class="v ${r.val ? 'yes' : 'no'}">${r.val ? 'PERMITIDO' : 'BLOQUEADO'}</span>
      <button class="icon-btn" data-i="${i}" title="Esquecer (o site vai perguntar de novo)">${icon('close')}</button>
    </div>`).join('') : '<span class="none">Nenhum site pediu permissão ainda.</span>';
  $$('[data-i]', box).forEach(b => b.addEventListener('click', async () => {
    const r = rows[Number(b.dataset.i)];
    await NQ.api('removePermission', { origin: r.origin, perm: r.perm });
    renderPerms();
  }));
}

// ---------- extensoes ----------
async function renderExts() {
  const list = await NQ.api('extensions');
  const box = $('#exts');
  box.innerHTML = list.length ? list.map((x, i) => `<div class="panel-row">
      <span class="st">${esc((x.name || '?').slice(0, 2).toUpperCase())}</span>
      <span class="n"><b>${esc(x.name)} <small style="display:inline">${esc(x.version)}</small></b><small>${esc(x.path)}</small></span>
      <button class="icon-btn danger" data-x="${i}" title="Remover">${icon('trash')}</button>
    </div>`).join('') : '<p class="none" style="margin:0 0 12px">Nenhuma extensão carregada.</p>';
  $$('[data-x]', box).forEach(b => b.addEventListener('click', async () => {
    const x = list[Number(b.dataset.x)];
    await NQ.api('removeExtension', { id: x.id, path: x.path });
    renderExts();
  }));
}
$('#ext-add').addEventListener('click', async () => {
  const r = await NQ.api('addExtension');
  if (r.ok) toast('Extensão carregada');
  else if (r.error) toast('Não carregou: ' + r.error.slice(0, 80));
  renderExts();
});

// ---------- sistema ----------
async function refreshInfo() {
  const i = await NQ.api('info');
  $('#ab-info').textContent = `${i.blocklist.toLocaleString('pt-BR')} domínios na lista · ${i.blockedTotal.toLocaleString('pt-BR')} bloqueados desde que você abriu`;
  $('#data-dir').textContent = i.portable ? `Modo portátil: ${i.userData} (programa em ${i.portable.exeDir})` : i.userData;
  $('#default-info').textContent = i.isDefault ? 'O Nanquim já é o navegador padrão.' : 'Abre os links de outros programas no Nanquim.';
  $('#about').textContent = `Nanquim ${i.version} · motor Chromium ${i.chrome}`;
  if (!S || !S.downloadDir) $('#dl-dir').textContent = i.downloads;
}
$('#dl-change').addEventListener('click', async () => { const d = await NQ.api('chooseDownloadDir'); if (d) { $('#dl-dir').textContent = d; toast('Pasta alterada'); } });
$('#set-default').addEventListener('click', async () => { await NQ.api('setDefaultBrowser'); toast('Escolha o Nanquim na tela de apps padrão do Windows'); refreshInfo(); });
$('#open-data').addEventListener('click', () => NQ.api('openFolder', 'data'));
$('#reset').addEventListener('click', async () => {
  if (!confirm('Restaurar todas as configurações para o padrão?')) return;
  await NQ.api('resetSettings');
  toast('Configurações restauradas');
});

renderPerms();
renderExts();
setTimeout(goHash, 50);

// ---------- atualizacoes ----------
let INFO_VERSION = '';
function renderUpdate(u) {
  const info = $('#upd-info');
  const btn = $('#upd-btn');
  const v = INFO_VERSION ? `Versão ${INFO_VERSION}. ` : '';
  btn.textContent = 'Procurar agora';
  btn.disabled = false;
  btn.onclick = () => NQ.api('checkUpdates').then(renderUpdate);
  if (!u) return;
  switch (u.status) {
    case 'checking': info.textContent = v + 'Procurando versão nova...'; btn.disabled = true; break;
    case 'downloading': info.textContent = v + `Baixando a versão ${u.version} (${u.progress}%). Pode continuar navegando.`; btn.disabled = true; break;
    case 'ready':
      info.textContent = v + (u.manual
        ? `A versão ${u.version} já foi baixada para o pendrive. No modo portátil ela só entra quando você mandar:`
        : `A versão ${u.version} está pronta. Ela entra quando você fechar o navegador, ou agora:`);
      btn.textContent = 'Reiniciar e atualizar';
      btn.onclick = () => NQ.api('installUpdate');
      break;
    case 'latest': info.textContent = v + 'Você está com a versão mais nova. O Nanquim procura sozinho ao abrir e a cada 2 horas.'; break;
    case 'error': info.textContent = v + 'Não deu para procurar agora (sem internet ou servidor fora do ar). Ele tenta de novo sozinho.'; break;
    case 'dev': info.textContent = v + 'Atualização automática desligada no modo de desenvolvimento.'; break;
    default: info.textContent = v + 'O Nanquim procura versão nova sozinho ao abrir e a cada 2 horas.';
  }
}
NQ.api('info').then(i => { INFO_VERSION = i.version; return NQ.api('update'); }).then(renderUpdate);
NQ.on('update', renderUpdate);

// ---------- senha para abrir ----------
let LOCK_MODE = null; // 'create' | 'change' | 'remove'
async function renderLock() {
  const info = await NQ.api('lockInfo');
  $('#lock-info').textContent = info.enabled
    ? 'Ligada. O Nanquim pede a senha toda vez que abre.'
    : 'Desligada. Quem abrir o Nanquim neste computador entra direto.';
  $('#lock-create').hidden = info.enabled || LOCK_MODE !== null;
  $('#lock-actions').hidden = !info.enabled || LOCK_MODE !== null;
  $('#lock-idle').hidden = !info.enabled;
}

function openLockForm(mode) {
  LOCK_MODE = mode;
  const f = $('#lock-form');
  f.reset();
  $('#lf-err').textContent = '';
  $('#lf-cur-box').hidden = mode === 'create';
  $('#lf-new-box').hidden = mode === 'remove';
  $('#lf-go').textContent = mode === 'remove' ? 'Tirar senha' : 'Salvar senha';
  $('#lf-go').classList.toggle('primary', mode !== 'remove');
  $('#lf-go').classList.toggle('danger', mode === 'remove');
  f.hidden = false;
  renderLock();
  (mode === 'create' ? $('#lf-pw') : $('#lf-cur')).focus();
}

function closeLockForm() {
  LOCK_MODE = null;
  $('#lock-form').hidden = true;
  $('#lock-form').reset();
  renderLock();
}

$('#lock-create').addEventListener('click', () => openLockForm('create'));
$('#lock-change').addEventListener('click', () => openLockForm('change'));
$('#lock-off').addEventListener('click', () => openLockForm('remove'));
$('#lf-cancel').addEventListener('click', closeLockForm);
$('#lock-now').addEventListener('click', () => NQ.api('lockNow'));

$('#lock-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#lf-err');
  err.textContent = '';
  const current = $('#lf-cur').value;
  if (LOCK_MODE === 'remove') {
    const r = await NQ.api('lockRemove', { current });
    if (!r.ok) { err.textContent = r.error; $('#lf-cur').select(); return; }
    closeLockForm();
    toast('Senha tirada. O Nanquim abre direto de novo.');
    return;
  }
  const pw = $('#lf-pw').value;
  const pw2 = $('#lf-pw2').value;
  if (pw.length < 4) { err.textContent = 'A senha precisa ter pelo menos 4 caracteres.'; $('#lf-pw').focus(); return; }
  if (pw !== pw2) { err.textContent = 'As duas senhas não estão iguais.'; $('#lf-pw2').select(); return; }
  const r = await NQ.api('lockSet', { current, password: pw, hint: $('#lf-hint').value });
  if (!r.ok) { err.textContent = r.error; return; }
  const was = LOCK_MODE;
  closeLockForm();
  toast(was === 'create' ? 'Senha criada. Da próxima vez que abrir, o Nanquim vai pedir.' : 'Senha trocada.');
});

renderLock();

// ---------- senhas salvas ----------
const PWS = { shown: new Map(), after: null, timer: null };

async function renderPasswords() {
  const info = await NQ.api('pwInfo');
  const q = $('#pw-q').value;
  const list = await NQ.api('pwList', q);
  $('#pw-count').textContent = info.count ? `${info.count} ${info.count === 1 ? 'senha salva' : 'senhas salvas'}` : 'Senhas salvas';
  if (!info.available) $('#pw-note').textContent = 'A proteção do Windows não está disponível agora, então o Nanquim não salva senhas novas.';
  else if (info.lock) $('#pw-note').textContent = 'As senhas ficam criptografadas pela proteção do Windows, e para ver ou copiar uma senha aqui o Nanquim pede a senha dele.';
  else $('#pw-note').textContent = 'As senhas ficam criptografadas pela proteção do Windows. Dica: com a senha para abrir o Nanquim ligada (em Privacidade), ver ou copiar uma senha aqui também pede essa senha.';
  const box = $('#pw-list');
  if (!list.length) {
    box.innerHTML = `<div class="pw-empty">${q ? 'Nada encontrado.' : 'Nenhuma senha salva ainda. Entre em algum site e o Nanquim vai perguntar se quer salvar.'}</div>`;
  } else {
    box.innerHTML = list.map(it => {
      const shown = PWS.shown.has(it.id);
      return `<div class="pw-row" data-id="${esc(it.id)}">
        ${favImg(it.site, it.host)}
        <span class="site" title="${esc(it.host)}">${esc(it.host)}</span>
        <span class="user" title="${esc(it.username)}">${esc(it.username || '(sem usuário)')}</span>
        <span class="pass${shown ? ' shown' : ''}">${shown ? esc(PWS.shown.get(it.id)) : '••••••••••'}</span>
        <span class="acts">
          <button class="icon-btn" data-eye title="${shown ? 'Esconder' : 'Mostrar a senha'}">${icon(shown ? 'eyeOff' : 'eye')}</button>
          <button class="icon-btn" data-copy title="Copiar a senha">${icon('copy')}</button>
          <button class="icon-btn danger" data-del title="Apagar">${icon('trash')}</button>
        </span>
      </div>`;
    }).join('');
    hydrateFavs(box);
  }
  const nv = await NQ.api('pwNever');
  $('#pw-never-card').hidden = !nv.length;
  $('#pw-never').innerHTML = nv.map(n => `<span class="chip">${esc(n.host)}<button class="icon-btn" data-un="${esc(n.site)}" title="Voltar a oferecer">${icon('close')}</button></span>`).join('');
}

// ver ou copiar: com a senha do Nanquim ligada, pede ela uma vez (fica liberado por 5 minutos)
async function pwAction(id, copy, current) {
  const r = await NQ.api('pwReveal', { id, copy, current });
  if (r.ok) {
    $('#pw-auth').hidden = true;
    if (copy) toast('Senha copiada. Ela sai da área de transferência em 45 segundos.');
    else { PWS.shown.set(id, r.password); renderPasswords(); }
    return true;
  }
  if (r.needAuth) {
    PWS.after = { id, copy };
    const f = $('#pw-auth');
    f.hidden = false;
    $('#pw-auth-err').textContent = current !== undefined ? r.error : '';
    $('#pw-auth-in').value = '';
    $('#pw-auth-in').focus();
    return false;
  }
  toast(r.error || 'Não deu certo.');
  return false;
}

$('#pw-auth').addEventListener('submit', (e) => {
  e.preventDefault();
  if (PWS.after) pwAction(PWS.after.id, PWS.after.copy, $('#pw-auth-in').value);
});

$('#pw-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  const row = e.target.closest('.pw-row');
  if (!b || !row) return;
  const id = row.dataset.id;
  if (b.hasAttribute('data-eye')) {
    if (PWS.shown.has(id)) { PWS.shown.delete(id); renderPasswords(); } else pwAction(id, false);
  } else if (b.hasAttribute('data-copy')) pwAction(id, true);
  else if (b.hasAttribute('data-del')) {
    // apagar pede dois cliques
    if (b.dataset.armed) { await NQ.api('pwDelete', id); PWS.shown.delete(id); toast('Senha apagada'); renderPasswords(); return; }
    b.dataset.armed = '1';
    b.classList.add('armed');
    b.title = 'Clique de novo para apagar';
    toast('Clique de novo na lixeira para apagar');
    setTimeout(() => { delete b.dataset.armed; b.classList.remove('armed'); b.title = 'Apagar'; }, 3000);
  }
});

$('#pw-never').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-un]');
  if (b) { await NQ.api('pwUnNever', b.dataset.un); renderPasswords(); }
});

$('#pw-q').addEventListener('input', () => { clearTimeout(PWS.timer); PWS.timer = setTimeout(renderPasswords, 120); });

$('#pw-import').addEventListener('click', async () => {
  const r = await NQ.api('pwImport');
  if (r.canceled) return;
  if (!r.ok) { toast(r.error || 'Não deu para importar.'); return; }
  toast(`Importadas: ${r.added} novas${r.updated ? `, ${r.updated} atualizadas` : ''}. Agora apague o arquivo .csv.`);
  renderPasswords();
});

renderPasswords();
