'use strict';
const $ = (s) => document.querySelector(s);
let shownPw = '';

function report() { window.pwb.size(Math.ceil($('#card').getBoundingClientRect().height) + 2); }

window.pwb.on((d) => {
  document.body.dataset.theme = d.theme === 'papel' ? 'papel' : 'tinta';
  document.documentElement.style.setProperty('--accent-pick', d.accent || '#e0452b');
  const upd = d.action === 'update';
  $('#title').textContent = upd ? 'Atualizar a senha salva?' : 'Salvar senha?';
  $('#save').textContent = upd ? 'Atualizar' : 'Salvar';
  $('#never').hidden = upd;
  $('#host').textContent = d.host || '';
  $('#u').value = d.username || '';
  $('#u').readOnly = upd;
  shownPw = d.password || '';
  $('#p').value = shownPw;
  $('#p').type = 'password';
  document.body.classList.remove('on');
  requestAnimationFrame(() => { report(); document.body.classList.add('on'); });
});

$('#save').addEventListener('click', () => window.pwb.act('save', $('#u').value.trim()));
$('#later').addEventListener('click', () => window.pwb.act('later'));
$('#x').addEventListener('click', () => window.pwb.act('later'));
$('#never').addEventListener('click', () => window.pwb.act('never'));
$('#eye').addEventListener('click', () => { $('#p').type = $('#p').type === 'password' ? 'text' : 'password'; });
$('#u').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#save').click(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.pwb.act('later'); });
new ResizeObserver(report).observe($('#card'));
