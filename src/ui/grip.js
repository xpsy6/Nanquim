'use strict';
// Arrastar a alca muda a largura do painel. Usa a posicao na tela (screenX), que nao muda
// quando a alca cresce para cobrir a janela durante o arraste.
const h = document.getElementById('h');
let dragging = false;
let lastX = null;
let queued = false;

h.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  dragging = true;
  document.body.classList.add('drag');
  window.grip.start(e.screenX);
});

window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  lastX = e.screenX;
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; if (dragging && lastX != null) window.grip.move(lastX); });
});

function end() {
  if (!dragging) return;
  dragging = false;
  document.body.classList.remove('drag');
  window.grip.end();
}
window.addEventListener('pointerup', end);
window.addEventListener('blur', end);
h.addEventListener('dblclick', () => window.grip.reset());
window.grip.onAccent((c) => document.documentElement.style.setProperty('--accent', c));
