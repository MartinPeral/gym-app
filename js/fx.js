// =============================================================
//  fx.js — Animaciones y gestos: entrada de pantallas, contadores,
//  indicador de pestañas y deslizar para borrar.
// =============================================================

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Entrada escalonada de los bloques de la pantalla */
export function stagger(root, on) {
  root.classList.toggle('enter', on && !reduced());
  if (!on) return;
  [...root.children].forEach((el, i) => el.style.setProperty('--i', Math.min(i, 9)));
}

// ---------- Números que "cuentan" hasta su valor ----------

const NUM_RE = /-?\d[\d.]*(?:,\d+)?/;
const SELECTOR = '.stat .v, .ring-label strong, .wh-big, .m-value, .big-stats .v';

function firstTextNode(el) {
  for (const n of el.childNodes) if (n.nodeType === 3 && NUM_RE.test(n.textContent)) return n;
  return null;
}

export function countUp(root) {
  if (reduced()) return;
  root.querySelectorAll(SELECTOR).forEach((el) => {
    const node = firstTextNode(el);
    if (!node) return;
    const original = node.textContent;
    const m = original.match(NUM_RE);
    const target = Number(m[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(target) || target === 0) return;
    const dec = (m[0].split(',')[1] || '').length;
    const [pre, post] = [original.slice(0, m.index), original.slice(m.index + m[0].length)];
    const fmt = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const t0 = performance.now();
    const dur = 700;
    const step = (t) => {
      if (!node.isConnected) return;
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      node.textContent = k < 1 ? pre + fmt(target * e) + post : original;
      if (k < 1) requestAnimationFrame(step);
    };
    node.textContent = pre + fmt(0) + post;
    requestAnimationFrame(step);
  });
}

// ---------- Indicador deslizante de la barra de pestañas ----------

let lastTab = null;

export function moveTabIndicator() {
  const nav = document.getElementById('tabbar');
  const ind = nav.querySelector('.tab-ind');
  const a = nav.querySelector('a.active');
  if (!ind) return;
  if (!a || document.body.classList.contains('no-tabs')) { ind.style.opacity = '0'; return; }
  const w = Math.min(64, a.offsetWidth - 10);
  ind.style.opacity = '1';
  ind.style.width = `${w}px`;
  ind.style.transform = `translateX(${a.offsetLeft + (a.offsetWidth - w) / 2}px)`;
  if (lastTab && lastTab !== a.dataset.tab && !reduced()) {
    a.classList.remove('bump');
    void a.offsetWidth;
    a.classList.add('bump');
  }
  if (!lastTab) requestAnimationFrame(() => nav.classList.add('ready'));
  lastTab = a.dataset.tab;
}

// ---------- Deslizar a la izquierda para borrar ----------

/**
 * Activa el gesto en los elementos .swipe[data-swipe="1"].
 * onDelete(el) se llama al soltar pasado el umbral.
 */
export function initSwipe(onDelete) {
  const LIMIT = 84;
  let st = null;
  let blockClick = false;

  document.addEventListener('pointerdown', (e) => {
    const sw = e.target.closest('.swipe[data-swipe="1"]');
    if (!sw || e.target.closest('.check') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    st = { sw, row: sw.querySelector('.swipe-row'), x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId };
  });

  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (!st.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
      if (dx > -12 || Math.abs(dx) < Math.abs(dy)) return;
      st.on = true;
      st.sw.classList.add('dragging');
      if (document.activeElement?.blur && st.sw.contains(document.activeElement)) document.activeElement.blur();
    }
    st.dx = Math.min(0, dx);
    const x = st.dx > -LIMIT ? st.dx : -LIMIT + (st.dx + LIMIT) * 0.35; // resistencia
    st.row.style.transform = `translateX(${x}px)`;
    st.sw.classList.toggle('armed', st.dx <= -LIMIT);
  });

  const end = () => {
    if (!st) return;
    const { sw, row, dx, on } = st;
    st = null;
    if (!on) return;
    blockClick = true;
    setTimeout(() => (blockClick = false), 350);
    sw.classList.remove('dragging');
    if (dx <= -LIMIT) {
      sw.classList.add('removing');
      row.style.transform = 'translateX(-105%)';
      setTimeout(() => onDelete(sw), 200);
    } else {
      row.style.transform = '';
      sw.classList.remove('armed');
    }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);

  // Evita que el "clic" del final del gesto active algo
  document.addEventListener('click', (e) => {
    if (blockClick && e.target.closest('.swipe')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
