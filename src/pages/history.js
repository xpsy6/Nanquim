'use strict';

$('[data-i="search"]').outerHTML = icon('search');
const PAGE = 150;
let items = [];
let query = '';
let reqId = 0;

function dayLabel(t) {
  const d = new Date(t);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

async function load(reset) {
  const id = ++reqId;
  const res = await NQ.api('history', { query, offset: reset ? 0 : items.length, limit: PAGE });
  if (id !== reqId) return;
  items = reset ? res : items.concat(res);
  $('#more').hidden = res.length < PAGE;
  render();
}

function render() {
  const box = $('#list');
  if (!items.length) {
    box.innerHTML = `<div class="empty"><b>${query ? 'Nada encontrado' : 'Página em branco'}</b><span>${query ? 'Tente outra palavra.' : 'Os sites que você visitar aparecem aqui.'}</span></div>`;
    return;
  }
  let html = '';
  let last = '';
  for (const h of items) {
    const label = dayLabel(h.time);
    if (label !== last) {
      const count = items.filter(x => dayLabel(x.time) === label).length;
      html += `<div class="group-label">${esc(label)} <small>${count} ${count === 1 ? 'página' : 'páginas'}</small></div>`;
      last = label;
    }
    const time = new Date(h.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    html += `<div class="row" data-id="${h.id}">
      <span class="time">${time}</span>
      ${favImg(h.url, h.title)}
      <a class="title" href="${esc(h.url)}">${esc(h.title || h.url)}</a>
      <span class="url">${esc(hostOf(h.url))}</span>
      <span class="actions"><button class="icon-btn danger" title="Remover do histórico">${icon('trash')}</button></span>
    </div>`;
  }
  box.innerHTML = html;
  hydrateFavs(box);
  $$('.row', box).forEach(row => {
    const h = items.find(x => x.id === Number(row.dataset.id));
    bindOpen(row.querySelector('.title'), h.url);
    row.querySelector('.actions button').addEventListener('click', async () => {
      await NQ.api('deleteHistory', [h.id]);
      items = items.filter(x => x !== h);
      render();
    });
  });
}

let t = null;
$('#q').addEventListener('input', (e) => {
  clearTimeout(t);
  t = setTimeout(() => { query = e.target.value; load(true); }, 150);
});
$('#more').addEventListener('click', () => load(false));
$('#clear').addEventListener('click', () => NQ.open('nanquim://settings/#privacidade'));

load(true);
