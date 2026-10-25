'use strict';
// Textos e botoes da capa do painel, conforme o estado que o processo principal manda.
const $ = (s) => document.querySelector(s);

// motivo em palavras simples para os erros de rede mais comuns
function reason(code) {
  const c = Number(code);
  if (c === -106) return 'O computador está sem internet agora.';
  if (c === -105 || c === -137) return 'Não achei o endereço do site. Confira se a internet está funcionando.';
  if ([-7, -118, -100, -101, -102, -104, -109, -21, -324].includes(c)) return 'A conexão com o site caiu no meio do caminho.';
  if (c <= -200 && c > -300) return 'O certificado de segurança do site foi recusado. Às vezes é o antivírus analisando as conexões.';
  if (c === -20) return 'Algo no navegador impediu a página de abrir.';
  if (c >= -199 && c <= -110) return 'A conexão segura com o site não deu certo.';
  if (c <= -300 && c > -400) return 'O site respondeu de um jeito que não deu para entender.';
  return 'O site não respondeu como deveria.';
}

function render(d) {
  document.body.dataset.theme = d.theme === 'papel' ? 'papel' : 'tinta';
  document.documentElement.style.setProperty('--accent-pick', d.accent || '#e0452b');
  document.body.dataset.s = d.status;

  const ic = $('#ic'), ini = $('#ini');
  if (d.icon) { ic.src = d.icon; ic.hidden = false; ini.hidden = true; }
  else { ini.textContent = (d.name || '?').trim().charAt(0).toUpperCase(); ini.hidden = false; ic.hidden = true; }
  $('#name').textContent = d.name || '';
  $('#host').textContent = d.host || '';

  let msg = 'Carregando', det = '', code = '';
  const acts = [];
  const retry = { id: 'retry', label: 'Tentar de novo', main: true };
  const tab = { id: 'tab', label: 'Abrir numa aba' };
  switch (d.status) {
    case 'loading':
      msg = d.healing ? 'Arrumando e carregando de novo' : 'Carregando';
      break;
    case 'slow':
      msg = 'Está demorando mais que o normal.';
      det = 'Pode ser a internet ou o próprio site. Dá para esperar mais um pouco ou tentar de novo.';
      acts.push(retry, tab);
      break;
    case 'error':
      msg = 'Não deu para abrir.';
      det = reason(d.code);
      code = [d.desc, d.code].filter(Boolean).join(' · ');
      acts.push(retry, tab);
      break;
    case 'crash':
      msg = 'O painel travou.';
      det = 'Tentei abrir de novo sozinho e ele não voltou.';
      code = d.desc || '';
      acts.push({ ...retry, label: 'Recarregar' }, tab);
      break;
    case 'blank':
      msg = 'A página veio em branco.';
      det = 'Já limpei o cache desse site e recarreguei uma vez. Seus logins continuam salvos.';
      acts.push({ ...retry, label: 'Recarregar' }, tab, { id: 'show', label: 'Mostrar assim mesmo' });
      break;
  }
  $('#msg').textContent = msg;
  $('#det').textContent = det; $('#det').hidden = !det;
  $('#code').textContent = code; $('#code').hidden = !code;
  const box = $('#acts');
  box.innerHTML = '';
  for (const a of acts) {
    const b = document.createElement('button');
    b.className = 'btn' + (a.main ? ' main' : '');
    b.textContent = a.label;
    b.addEventListener('click', () => window.cover.act(a.id));
    box.appendChild(b);
  }
  const copy = $('#copy');
  copy.hidden = d.status === 'loading';
  if (d.copied) copy.textContent = 'Detalhes copiados. É só colar com Ctrl+V';
  else copy.textContent = 'Copiar detalhes';
  requestAnimationFrame(() => document.body.classList.add('on'));
}

$('#copy').addEventListener('click', () => window.cover.act('copy'));
window.cover.on(render);
