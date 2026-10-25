// Nanquim: print da pagina (escolher area, area visivel ou pagina inteira) com editor.
'use strict';

const Snap = (() => {
  const SNAP_ICONS = {
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    visible: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16"/>',
    full: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    pen: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
    marker: '<path d="M4 20h7"/><path d="M8 16l9-9 3 3-9 9H8z"/>',
    arrow: '<path d="M5 19L19 5M10 5h9v9"/>',
    rect: '<rect x="4.5" y="6.5" width="15" height="11" rx="2"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    blur: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h2v2H8zM12 8h2v2h-2zM10 10h2v2h-2zM14 10h2v2h-2zM8 12h2v2H8zM12 12h2v2h-2zM10 14h2v2h-2zM14 14h2v2h-2z" fill="currentColor" stroke="none"/>',
    undo: '<path d="M9 4L4 9l5 5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    save: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SNAP_ICONS[n]}</svg>`;
  const TOOLS = [['pen', 'Caneta'], ['marker', 'Marca-texto'], ['arrow', 'Seta'], ['rect', 'Retângulo'], ['text', 'Texto'], ['blur', 'Desfocar']];
  const COLORS = ['accent', '#e0452b', '#f2c94c', '#3ccf7e', '#5b8bd6', '#ffffff', '#151310'];
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  let root = null;
  let shot = null;       // { data, rect }
  let busy = false;

  function accentHex() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent-pick').trim() || '#e0452b';
  }

  // ---------- abrir ----------
  async function open() {
    if (root || busy) return;
    busy = true;
    try {
      if (typeof pop !== 'undefined' && pop) closePop(true, true);
      if (typeof frozen !== 'undefined' && frozen) { unfreeze(); await wait(180); }
      const r = await nq.invoke('snapStart');
      if (!r) { busy = false; return; }
      shot = r;
      buildSelect();
    } finally { busy = false; }
  }

  function end() {
    if (!root) return;
    const el = root;
    root = null;
    el.classList.add('closing');
    setTimeout(() => el.remove(), 170);
    document.removeEventListener('keydown', onKey, true);
    nq.invoke('unfreeze');
    nq.send('focusPage');
  }

  // ---------- etapa 1: escolher a area ----------
  function buildSelect() {
    root = document.createElement('div');
    root.id = 'snap';
    const r = shot.rect;
    root.innerHTML = `
      <div class="snap-scrim"></div>
      <div class="snap-stage" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px">
        <img alt="" src="${shot.data}"><div class="snap-dim"></div><div class="snap-sel" hidden><span class="snap-size"></span></div>
      </div>
      <div class="snap-bar">
        <span class="hint"><b>Arraste</b> para escolher a área</span>
        <button class="sbtn" data-a="visible">${ic('visible')}Área visível</button>
        <button class="sbtn" data-a="full">${ic('full')}Página inteira</button>
        <span class="ssep"></span>
        <button class="sbtn icon" data-a="close" title="Cancelar (Esc)">${ic('close')}</button>
      </div>`;
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey, true);
    const bar = root.querySelector('.snap-bar');
    bar.style.top = Math.max(10, r.y + 12) + 'px';
    bar.querySelector('[data-a="visible"]').addEventListener('click', () => editFrom(shot.data, null));
    bar.querySelector('[data-a="full"]').addEventListener('click', fullPage);
    bar.querySelector('[data-a="close"]').addEventListener('click', end);
    root.querySelector('.snap-scrim').addEventListener('mousedown', end);

    const stage = root.querySelector('.snap-stage');
    const sel = root.querySelector('.snap-sel');
    const dim = root.querySelector('.snap-dim');
    const size = root.querySelector('.snap-size');
    let start = null;
    let box = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      const b = stage.getBoundingClientRect();
      start = { x: e.clientX - b.left, y: e.clientY - b.top };
      box = null;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!start) return;
      const b = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(b.width, e.clientX - b.left));
      const y = Math.max(0, Math.min(b.height, e.clientY - b.top));
      box = { x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.abs(x - start.x), h: Math.abs(y - start.y) };
      if (box.w < 3 && box.h < 3) return;
      sel.hidden = false;
      dim.style.opacity = 0;
      Object.assign(sel.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
      sel.classList.toggle('low', box.y < 34);
      size.textContent = `${Math.round(box.w)} × ${Math.round(box.h)}`;
    });
    stage.addEventListener('pointerup', () => {
      const b = box;
      start = null;
      if (b && b.w > 8 && b.h > 8) editFrom(shot.data, b);
      else { sel.hidden = true; dim.style.opacity = 1; }
    });
  }

  async function fullPage() {
    const bar = root.querySelector('.snap-bar');
    bar.hidden = true;
    const msg = document.createElement('div');
    msg.className = 'snap-busy';
    msg.innerHTML = '<span class="spinner"></span>Capturando a página inteira...';
    root.appendChild(msg);
    const r = await nq.invoke('snapFull');
    msg.remove();
    if (!r) { bar.hidden = false; toast('Não deu para capturar a página inteira. Tente a área visível.'); return; }
    editFrom(r.data, null, r.cut ? 'A página é muito comprida, a imagem foi cortada no fim.' : '');
  }

  // ---------- etapa 2: editor ----------
  async function editFrom(dataUrl, crop, note = '') {
    const img = await loadImg(dataUrl);
    const base = document.createElement('canvas');
    if (crop) {
      const k = img.naturalWidth / shot.rect.width;
      base.width = Math.max(1, Math.round(crop.w * k));
      base.height = Math.max(1, Math.round(crop.h * k));
      base.getContext('2d').drawImage(img, crop.x * k, crop.y * k, crop.w * k, crop.h * k, 0, 0, base.width, base.height);
    } else {
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      base.getContext('2d').drawImage(img, 0, 0);
    }
    buildEditor(base, note);
  }

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  function buildEditor(base, note) {
    root.querySelectorAll('.snap-stage, .snap-bar').forEach(x => x.remove());
    const ed = document.createElement('div');
    ed.className = 'snap-editor';
    ed.innerHTML = `
      <div class="snap-tools">
        <span class="title">Print</span>
        ${TOOLS.map(([id, name]) => `<button class="sbtn icon" data-tool="${id}" title="${name}">${ic(id)}</button>`).join('')}
        <span class="ssep"></span>
        ${COLORS.map(c => `<button class="swatch" data-color="${c}" title="${c === 'accent' ? 'Cor do navegador' : c}" style="background:${c === 'accent' ? accentHex() : c}"></button>`).join('')}
        <span class="ssep"></span>
        <button class="sbtn icon" data-a="undo" title="Desfazer (Ctrl+Z)" disabled>${ic('undo')}</button>
        <span class="grow"></span>
        <button class="sbtn primary" data-a="copy">${ic('copy')}Copiar</button>
        <button class="sbtn" data-a="save">${ic('save')}Salvar no PC...</button>
        <button class="sbtn icon" data-a="close" title="Fechar (Esc)">${ic('close')}</button>
      </div>
      <div class="snap-canvas-wrap t-pen"><canvas></canvas></div>
      <div class="snap-foot"><span class="dims"></span><span class="note"></span><span class="grow"></span>
        <span class="copied" hidden>Copiado: é só colar com Ctrl+V</span>
        <span class="kbd">Ctrl+Z desfazer · Ctrl+S salvar no PC · Esc fechar</span></div>`;
    root.appendChild(ed);
    root.querySelector('.snap-scrim').onmousedown = null;

    const wrap = ed.querySelector('.snap-canvas-wrap');
    const cv = ed.querySelector('canvas');
    const ctx = cv.getContext('2d');
    cv.width = base.width;
    cv.height = base.height;
    const dpr = window.devicePixelRatio || 1;
    ed.querySelector('.dims').textContent = `${Math.round(base.width / dpr)} × ${Math.round(base.height / dpr)} px`;
    ed.querySelector('.note').textContent = note;

    // tamanho na tela: cabe na largura, rola na altura se precisar
    const fit = () => {
      const maxW = wrap.clientWidth - 48;
      const maxH = wrap.clientHeight - 48;
      let w = Math.min(base.width / dpr, maxW);
      const tall = base.height / base.width > 2.2;
      if (!tall) w = Math.min(w, maxH * base.width / base.height);
      cv.style.width = Math.max(40, w) + 'px';
      cv.style.height = 'auto';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    let tool = 'pen';
    let color = 'accent';
    const shapes = [];
    let cur = null;
    const colorOf = (c) => c === 'accent' ? accentHex() : c;
    const scale = () => cv.width / cv.getBoundingClientRect().width; // pixels da imagem por pixel de tela
    const undoBtn = ed.querySelector('[data-a="undo"]');

    const setTool = (t) => {
      tool = t;
      ed.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
      wrap.className = 'snap-canvas-wrap t-' + t;
    };
    const setColor = (c) => {
      color = c;
      ed.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('on', b.dataset.color === c));
    };
    setTool('pen');
    setColor('accent');
    ed.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    ed.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => setColor(b.dataset.color)));

    function pixelate(x, y, w, h) {
      if (w < 2 || h < 2) return;
      const block = Math.max(6, Math.round(Math.min(w, h) / 10));
      const sw = Math.max(1, Math.round(w / block)), sh = Math.max(1, Math.round(h / block));
      const tmp = document.createElement('canvas');
      tmp.width = sw; tmp.height = sh;
      tmp.getContext('2d').drawImage(base, x, y, w, h, 0, 0, sw, sh);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, sw, sh, x, y, w, h);
      ctx.restore();
    }

    function drawShape(s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      if (s.type === 'pen' || s.type === 'marker') {
        if (s.type === 'marker') { ctx.globalAlpha = 0.38; ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'butt'; }
        ctx.lineWidth = s.w;
        ctx.beginPath();
        s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.1, s.pts[0].y);
        ctx.stroke();
      } else if (s.type === 'rect') {
        ctx.lineWidth = s.w;
        const r = Math.min(10 * s.k, Math.abs(s.x2 - s.x1) / 2, Math.abs(s.y2 - s.y1) / 2);
        ctx.beginPath();
        ctx.roundRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1), r);
        ctx.stroke();
      } else if (s.type === 'arrow') {
        const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        const head = Math.min(len * 0.45, 18 * s.k);
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2 - Math.cos(a) * head * 0.6, s.y2 - Math.sin(a) * head * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 - head * Math.cos(a - 0.45), s.y2 - head * Math.sin(a - 0.45));
        ctx.lineTo(s.x2 - head * Math.cos(a + 0.45), s.y2 - head * Math.sin(a + 0.45));
        ctx.closePath();
        ctx.fill();
      } else if (s.type === 'text') {
        ctx.font = `700 ${s.size}px Gothic, "Segoe UI", sans-serif`;
        ctx.textBaseline = 'top';
        // contorno para o texto aparecer sobre qualquer fundo
        ctx.lineWidth = s.size / 6;
        ctx.strokeStyle = (s.color.toLowerCase() === '#151310') ? '#ffffff' : 'rgba(0,0,0,.55)';
        s.text.split('\n').forEach((line, i) => {
          ctx.strokeText(line, s.x, s.y + i * s.size * 1.2);
          ctx.fillText(line, s.x, s.y + i * s.size * 1.2);
        });
      } else if (s.type === 'blur') {
        pixelate(Math.round(Math.min(s.x1, s.x2)), Math.round(Math.min(s.y1, s.y2)), Math.round(Math.abs(s.x2 - s.x1)), Math.round(Math.abs(s.y2 - s.y1)));
      }
      ctx.restore();
    }

    function redraw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(base, 0, 0);
      // o desfoque vem primeiro para nao borrar os desenhos feitos depois
      shapes.filter(s => s.type === 'blur').forEach(drawShape);
      shapes.filter(s => s.type !== 'blur').forEach(drawShape);
      if (cur) drawShape(cur);
      undoBtn.disabled = shapes.length === 0;
      if (!cur && afterDraw) afterDraw();
    }
    redraw();

    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      const k = cv.width / b.width;
      return { x: (e.clientX - b.left) * k, y: (e.clientY - b.top) * k };
    };

    let textBox = null;
    function commitText() {
      if (!textBox) return;
      const t = textBox.value.trim();
      if (t) shapes.push({ type: 'text', text: t, x: textBox._x, y: textBox._y, size: textBox._size, color: textBox._color });
      textBox.remove();
      textBox = null;
      redraw();
    }

    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (textBox) { commitText(); return; }
      const p = pos(e);
      const k = scale();
      const c = colorOf(color);
      if (tool === 'text') {
        const b = cv.getBoundingClientRect();
        const wb = wrap.getBoundingClientRect();
        const sizeScreen = 22;
        textBox = document.createElement('input');
        textBox.className = 'snap-text';
        textBox._x = p.x; textBox._y = p.y; textBox._size = sizeScreen * k; textBox._color = c;
        Object.assign(textBox.style, {
          left: (e.clientX - wb.left + wrap.scrollLeft) + 'px', top: (e.clientY - wb.top + wrap.scrollTop) + 'px',
          height: sizeScreen * 1.35 + 'px', fontSize: sizeScreen + 'px', color: c
        });
        wrap.appendChild(textBox);
        setTimeout(() => textBox && textBox.focus(), 0);
        textBox.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); commitText(); }
          if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); textBox.remove(); textBox = null; }
          ev.stopPropagation();
        });
        textBox.addEventListener('blur', () => setTimeout(commitText, 0));
        return;
      }
      cv.setPointerCapture(e.pointerId);
      if (tool === 'pen') cur = { type: 'pen', pts: [p], w: 4 * k, color: c };
      else if (tool === 'marker') cur = { type: 'marker', pts: [p], w: 18 * k, color: c };
      else cur = { type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, w: 3.5 * k, k, color: c };
      redraw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const p = pos(e);
      if (cur.pts) {
        // marca-texto fica na horizontal se o movimento for quase reto
        if (cur.type === 'marker' && cur.pts.length > 1 && e.shiftKey) p.y = cur.pts[0].y;
        cur.pts.push(p);
      } else { cur.x2 = p.x; cur.y2 = p.y; }
      redraw();
    });
    const finish = () => {
      if (!cur) return;
      const tiny = cur.pts ? false : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) < 4;
      if (!tiny) shapes.push(cur);
      cur = null;
      redraw();
    };
    cv.addEventListener('pointerup', finish);
    cv.addEventListener('pointercancel', finish);

    const undo = () => { commitText(); shapes.pop(); redraw(); };
    undoBtn.addEventListener('click', undo);

    const exportData = () => { commitText(); return cv.toDataURL('image/png'); };
    const copiedTag = ed.querySelector('.copied');
    // o print fica sempre na area de transferencia, ja com os desenhos: e so dar Ctrl+V
    let copyTimer = null;
    const autoCopy = () => {
      clearTimeout(copyTimer);
      copyTimer = setTimeout(async () => {
        const ok = await nq.invoke('snapCopy', cv.toDataURL('image/png'));
        copiedTag.hidden = !ok;
      }, 250);
    };
    autoCopy();
    afterDraw = autoCopy;
    const copy = async () => {
      const ok = await nq.invoke('snapCopy', exportData());
      toast(ok ? 'Copiado. Cole com Ctrl+V onde quiser.' : 'Não deu para copiar.');
    };
    const save = async () => {
      const file = await nq.invoke('snapSave', exportData());
      if (!file) return;
      const name = file.split(/[\\/]/).pop();
      toast(`Salvo: ${name}`, 'Mostrar na pasta', () => nq.invoke('snapShow', file));
    };
    ed.querySelector('[data-a="copy"]').addEventListener('click', copy);
    ed.querySelector('[data-a="save"]').addEventListener('click', () => save());
    ed.querySelector('[data-a="close"]').addEventListener('click', () => { ro.disconnect(); end(); });

    editorKeys = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (ctrl && e.key.toLowerCase() === 'c' && !textBox) { e.preventDefault(); copy(); }
      else if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      else if (!ctrl && !textBox) {
        const map = { p: 'pen', m: 'marker', a: 'arrow', r: 'rect', t: 'text', d: 'blur' };
        if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
      }
    };
  }

  let editorKeys = null;
  let afterDraw = null;
  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); return; }
    if (editorKeys && root.querySelector('.snap-editor')) editorKeys(e);
  }

  let toastTimer = null;
  function toast(msg, action, onAction) {
    if (!root) return;
    const old = root.querySelector('.snap-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'snap-toast';
    t.innerHTML = `<span></span>${action ? '<button></button>' : ''}`;
    t.querySelector('span').textContent = msg;
    if (action) { const b = t.querySelector('button'); b.textContent = action; b.addEventListener('click', onAction); }
    root.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 4200);
  }

  return { open, icon: ic('camera') };
})();
