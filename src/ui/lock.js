'use strict';
// Tela de senha do Nanquim. Usa $ e drawEnso de ../pages/common.js.
const pw = $('#pw');
const form = $('#f');
const msg = $('#msg');
const go = $('#go');
let waitTimer = null;

function setMsg(html) { msg.innerHTML = html; }
function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function hintHtml(hint) { return hint ? `<span class="hint">Dica: <b>${escHtml(hint)}</b></span>` : ''; }

// muitas tentativas erradas: trava a digitacao por um tempo, com contagem regressiva
function waitFor(ms, hint) {
  clearInterval(waitTimer);
  const until = Date.now() + ms;
  pw.disabled = true; go.disabled = true;
  const tick = () => {
    const s = Math.ceil((until - Date.now()) / 1000);
    if (s <= 0) {
      clearInterval(waitTimer);
      pw.disabled = false; go.disabled = false;
      setMsg(hintHtml(hint));
      pw.focus();
      return;
    }
    const t = s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
    setMsg(`<span class="err">Muitas tentativas erradas. Espere ${t}.</span>${hintHtml(hint)}`);
  };
  tick();
  waitTimer = setInterval(tick, 500);
}

async function init() {
  const info = await window.lock.info();
  document.documentElement.dataset.theme = info.theme === 'papel' ? 'papel' : 'tinta';
  document.documentElement.style.setProperty('--accent-pick', info.accent || '#e0452b');
  const enso = (info.enso || info.accent || '#e0452b').toLowerCase() === '#ebe3d3' ? 'var(--text)' : (info.enso || info.accent);
  document.documentElement.style.setProperty('--enso-pick', enso);
  drawEnso($('#enso'), { paint: true, seed: 5 });
  if (info.mode === 'pause') $('#sub').textContent = 'Nanquim bloqueado. Digite sua senha para voltar';
  if (info.mode === 'tamper') {
    // o arquivo da senha sumiu (apagado por fora): so da para entrar apagando os logins
    $('#v-pass').hidden = true;
    $('#v-forgot').hidden = false;
    $('#f-title').textContent = 'A senha foi apagada por fora';
    $('#f-lead').textContent = 'O arquivo da senha deste Nanquim sumiu. Para ninguém entrar nas suas contas desse jeito, o Nanquim só abre depois de apagar:';
    $('#back').hidden = true;
    $('#confirm').focus();
    return;
  }
  if (info.waitMs > 0) waitFor(info.waitMs, info.hint);
  else if (info.hint) setMsg(hintHtml(info.hint));
  pw.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (pw.disabled) return;
  const value = pw.value;
  if (!value) { pw.focus(); return; }
  go.disabled = true;
  const r = await window.lock.attempt(value);
  if (r.ok) {
    document.body.classList.add('ok');
    setMsg('');
    return;
  }
  go.disabled = false;
  pw.value = '';
  form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
  if (r.waitMs > 0) return waitFor(r.waitMs, r.hint);
  setMsg(`<span class="err">Senha errada.</span>${hintHtml(r.hint)}`);
  pw.focus();
});

$('#eye').addEventListener('click', () => {
  pw.type = pw.type === 'password' ? 'text' : 'password';
  pw.focus();
});

// ---------- esqueci a senha ----------
$('#forgot').addEventListener('click', () => {
  $('#v-pass').hidden = true;
  $('#v-forgot').hidden = false;
  $('#v-forgot').classList.add('rise');
  $('#confirm').value = '';
  $('#wipe').disabled = true;
  $('#confirm').focus();
});
$('#back').addEventListener('click', () => {
  $('#v-forgot').hidden = true;
  $('#v-pass').hidden = false;
  pw.focus();
});
$('#confirm').addEventListener('input', (e) => { $('#wipe').disabled = e.target.value.trim().toUpperCase() !== 'APAGAR'; });
$('#confirm').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#wipe').disabled) $('#wipe').click(); });
$('#wipe').addEventListener('click', async () => {
  $('#wipe').disabled = true;
  $('#back').disabled = true;
  $('#wipe').textContent = 'Apagando...';
  await window.lock.forget();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#v-forgot').hidden && !$('#back').hidden) $('#back').click();
});

init();
