'use strict';

const DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function tick() {
  const d = new Date();
  $('#hh').textContent = String(d.getHours()).padStart(2, '0');
  $('#mm').textContent = String(d.getMinutes()).padStart(2, '0');
  $('#date').textContent = `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
tick();
setInterval(tick, 1000);

// o circulo e pintado toda vez que a nova aba abre
drawEnso($('#enso'), { paint: true });

// busca: a tinta escorre pela linha quando voce digita
const form = $('#search');
const q = $('#q');
q.addEventListener('focus', () => form.classList.add('on'));
q.addEventListener('blur', () => { if (!q.value) form.classList.remove('on'); });
q.addEventListener('input', () => form.classList.toggle('on', !!q.value || document.activeElement === q));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = q.value.trim();
  if (v) NQ.open(v, false);
});

let dial = [];
let adding = false;

function renderDial() {
  const box = $('#dial');
  box.innerHTML = dial.map((d, i) => `
    <a class="d" href="${esc(d.url)}" data-i="${i}" style="--i:${i}">
      ${favImg(d.url, d.title, 'ic')}
      <span class="nm">${esc(d.title)}</span>
      <button class="icon-btn rm" title="Tirar atalho">${icon('close')}</button>
    </a>`).join('') +
    (dial.length < 16 ? `<button class="d add" id="add-tile" style="--i:${dial.length}"><span class="ic">${icon('plus')}</span><span class="nm">Adicionar</span></button>` : '') +
    (adding ? `<form class="add-form" id="add-form"><input class="field" id="add-url" placeholder="endereço (ex.: site.com.br)" required><input class="field" id="add-title" placeholder="nome (opcional)"><button class="btn primary" type="submit">Salvar</button></form>` : '');
  hydrateFavs(box);
  $$('.d[data-i]', box).forEach(t => {
    const d = dial[Number(t.dataset.i)];
    bindOpen(t, d.url);
    t.querySelector('.rm').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      dial.splice(Number(t.dataset.i), 1);
      save();
    });
  });
  const add = $('#add-tile');
  if (add) add.addEventListener('click', () => { adding = !adding; renderDial(); if (adding) $('#add-url').focus(); });
  const f = $('#add-form');
  if (f) {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let url = $('#add-url').value.trim();
      if (!url) return;
      if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
      dial.push({ title: $('#add-title').value.trim() || hostOf(url) || url, url });
      adding = false;
      save();
    });
    f.addEventListener('keydown', (e) => { if (e.key === 'Escape') { adding = false; renderDial(); } });
  }
}

function save() {
  renderDial();
  NQ.api('setSetting', { key: 'speedDial', value: dial });
}

let lastDial = '';
onSettings((s) => {
  const eng = s.searchEngines && s.searchEngines[s.searchEngine];
  $('#eng').textContent = (eng ? eng.name : 'Google')[0];
  q.placeholder = `Pesquisar no ${eng ? eng.name : 'Google'} ou digitar endereço`;
  document.body.classList.toggle('no-clock', s.newtabClock === false);
  document.body.classList.toggle('no-tone', s.newtabTexture === false);
  const key = JSON.stringify(s.speedDial || []);
  if (key !== lastDial && !adding) {
    lastDial = key;
    dial = (s.speedDial || []).slice();
    renderDial();
  }
});
