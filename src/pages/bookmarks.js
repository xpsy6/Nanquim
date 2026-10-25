'use strict';

$$('[data-i]').forEach(el => { el.outerHTML = icon(el.dataset.i); });
let list = [];
let query = '';
let editingId = null;

async function load() { list = await NQ.api('bookmarks'); render(); }

function render() {
  const q = query.trim().toLowerCase();
  const shown = list.filter(b => !q || b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q));
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'favorito' : 'favoritos'}`;
  const box = $('#list');
  if (!shown.length) {
    box.innerHTML = `<div class="empty"><b>${q ? 'Nada encontrado' : 'Nenhum favorito'}</b><span>${q ? 'Tente outra palavra.' : 'Clique na estrela da barra de endereço ou use Ctrl+D.'}</span></div>`;
    return;
  }
  box.innerHTML = shown.map(b => {
    const i = list.indexOf(b);
    if (b.id === editingId) {
      return `<div class="row editing" data-id="${b.id}">
        ${favImg(b.url, b.title)}
        <div class="edit"><input class="field" data-f="title" value="${esc(b.title)}"><input class="field" data-f="url" value="${esc(b.url)}"></div>
        <button class="btn primary" data-a="save">Salvar</button>
        <button class="btn ghost" data-a="cancel">Cancelar</button>
      </div>`;
    }
    return `<div class="row" data-id="${b.id}">
      ${favImg(b.url, b.title)}
      <a class="title" href="${esc(b.url)}">${esc(b.title)}</a>
      <span class="url">${esc(b.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>
      <span class="actions">
        <button class="icon-btn" data-a="up" title="Mover para cima" ${i === 0 || q ? 'disabled' : ''}>${icon('up')}</button>
        <button class="icon-btn" data-a="down" title="Mover para baixo" ${i === list.length - 1 || q ? 'disabled' : ''}>${icon('down')}</button>
        <button class="icon-btn" data-a="edit" title="Editar">${icon('edit')}</button>
        <button class="icon-btn danger" data-a="remove" title="Remover">${icon('trash')}</button>
      </span>
    </div>`;
  }).join('');
  hydrateFavs(box);

  $$('.row', box).forEach(row => {
    const id = Number(row.dataset.id);
    const b = list.find(x => x.id === id);
    const title = row.querySelector('.title');
    if (title) bindOpen(title, b.url);
    row.querySelectorAll('[data-a]').forEach(btn => btn.addEventListener('click', async () => {
      const a = btn.dataset.a;
      if (a === 'edit') { editingId = id; render(); row.querySelector('input'); $(`.row[data-id="${id}"] input`).focus(); return; }
      if (a === 'cancel') { editingId = null; render(); return; }
      if (a === 'save') {
        const t = row.querySelector('[data-f="title"]').value.trim();
        const u = row.querySelector('[data-f="url"]').value.trim();
        await NQ.api('updateBookmark', { id, title: t || u, url: u });
        editingId = null;
        return load();
      }
      if (a === 'remove') { await NQ.api('removeBookmark', id); toast('Favorito removido'); return load(); }
      if (a === 'up' || a === 'down') {
        await NQ.api('moveBookmark', { id, index: list.indexOf(b) + (a === 'up' ? -1 : 1) });
        return load();
      }
    }));
    row.querySelectorAll('.edit input').forEach(inp => inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') row.querySelector('[data-a="save"]').click();
      if (e.key === 'Escape') { editingId = null; render(); }
    }));
  });
}

$('#q').addEventListener('input', (e) => { query = e.target.value; render(); });
$('#add').addEventListener('click', () => { $('#add-form').hidden = false; $('#f-url').focus(); });
$('#f-cancel').addEventListener('click', () => { $('#add-form').hidden = true; });
$('#add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = $('#f-url').value.trim();
  if (!url) return;
  await NQ.api('addBookmark', { url, title: $('#f-title').value.trim() });
  $('#f-url').value = ''; $('#f-title').value = '';
  $('#add-form').hidden = true;
  toast('Favorito salvo');
  load();
});
$('#import').addEventListener('click', async () => {
  const n = await NQ.api('importBookmarks');
  if (n) toast(`${n} favoritos importados`);
  load();
});
$('#export').addEventListener('click', async () => { if (await NQ.api('exportBookmarks')) toast('Arquivo salvo'); });

load();
