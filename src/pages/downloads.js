'use strict';

$$('[data-i]').forEach(el => { el.outerHTML = icon(el.dataset.i); });
let list = [];
let query = '';

function meta(d) {
  if (d.state === 'progressing') {
    if (d.paused) return { t: `Pausado em ${fmtBytes(d.received)} de ${fmtBytes(d.total)}`, c: '' };
    const left = d.total && d.speed ? Math.round((d.total - d.received) / d.speed) : null;
    const time = left == null ? '' : left > 90 ? ` · faltam ${Math.round(left / 60)} min` : ` · faltam ${left} s`;
    return { t: `${fmtBytes(d.received)} de ${d.total ? fmtBytes(d.total) : '?'} · ${fmtBytes(d.speed)}/s${time}`, c: '' };
  }
  if (d.state === 'completed') {
    const when = new Date(d.start).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return d.exists === false ? { t: 'Arquivo apagado ou movido', c: 'bad' } : { t: `${fmtBytes(d.total || d.received)} · ${when}`, c: 'ok' };
  }
  if (d.state === 'cancelled') return { t: 'Cancelado', c: 'bad' };
  return { t: 'Falhou (conexão interrompida)', c: 'bad' };
}

function render() {
  const q = query.toLowerCase();
  const shown = list.filter(d => !q || d.filename.toLowerCase().includes(q) || d.url.toLowerCase().includes(q));
  const active = list.filter(d => d.state === 'progressing').length;
  $('#sub').textContent = active ? `${active} baixando agora` : `${list.length} na lista`;
  const box = $('#list');
  if (!shown.length) {
    box.innerHTML = `<div class="empty"><b>${q ? 'Nada encontrado' : 'Nada baixado'}</b><span>${q ? 'Tente outro nome.' : 'Arquivos que você baixar aparecem aqui.'}</span></div>`;
    return;
  }
  box.innerHTML = shown.map(d => {
    const m = meta(d);
    const pct = d.total ? Math.min(100, d.received / d.total * 100) : 0;
    let acts = '';
    if (d.state === 'progressing') {
      acts = `<button class="btn" data-a="${d.paused ? 'resume' : 'pause'}">${icon(d.paused ? 'play' : 'pause')}${d.paused ? 'Continuar' : 'Pausar'}</button><button class="btn danger" data-a="cancel">Cancelar</button>`;
    } else if (d.state === 'completed' && d.exists !== false) {
      acts = `<button class="btn" data-a="show">${icon('folder')}Mostrar na pasta</button><button class="icon-btn" data-a="remove" title="Tirar da lista">${icon('close')}</button>`;
    } else {
      acts = `<button class="btn" data-a="retry">${icon('retry')}Baixar de novo</button><button class="icon-btn" data-a="remove" title="Tirar da lista">${icon('close')}</button>`;
    }
    const ext = (d.filename.includes('.') ? d.filename.split('.').pop() : '').slice(0, 4);
    return `<div class="dlrow" data-id="${d.id}">
      <span class="ext">${esc(ext)}</span>
      <span class="name${d.state === 'completed' && d.exists !== false ? ' link' : ''}" title="${esc(d.savePath || d.filename)}">${esc(d.filename)}</span>
      <span class="acts">${acts}</span>
      <span class="src">${esc(d.url)}</span>
      ${d.state === 'progressing' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}
      <span class="meta ${m.c}">${esc(m.t)}</span>
    </div>`;
  }).join('');
  $$('.dlrow', box).forEach(row => {
    const id = Number(row.dataset.id);
    row.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => NQ.api('downloadAction', { id, action: b.dataset.a })));
    const name = row.querySelector('.name.link');
    if (name) name.addEventListener('click', () => NQ.api('downloadAction', { id, action: 'open' }));
  });
}

NQ.on('downloads', (d) => { list = d; render(); });
NQ.api('downloads').then(d => { list = d; render(); });
$('#q').addEventListener('input', (e) => { query = e.target.value; render(); });
$('#clear').addEventListener('click', () => NQ.api('downloadAction', { id: -1, action: 'clear' }).then(() => NQ.api('downloads').then(d => { list = d; render(); })));
$('#folder').addEventListener('click', () => NQ.api('openFolder', 'downloads'));
