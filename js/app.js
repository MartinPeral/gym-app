// =============================================================
//  app.js — Interfaz: navegación, pantallas y acciones
// =============================================================

import * as S from './store.js';
import { lineChart, barChart, bodyChart, sparkline } from './chart.js';
import { MUSCLES, bodyMap, muscleList, muscleSets } from './muscles.js';

const APP_VERSION = '1.4';
const VIVAGYM_APP = 'https://apps.apple.com/app/id6448747670';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const restEl = document.getElementById('rest');
const toastEl = document.getElementById('toast');

// ---------- Utilidades ----------

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const num = (n, d = 1) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });
const date = (t, o = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('es-ES', o).format(new Date(t));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const duration = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const kgShort = (kg) => (kg >= 1000 ? `${num(kg / 1000, 1)} t` : `${num(kg, 0)} kg`);
const pace = (min, km) => (km > 0 ? `${clock((min / km) * 60)} min/km` : '');
const isCardio = (ex) => (ex.type || S.exerciseType(ex.name)) === 'cardio';

function greeting() {
  const h = new Date().getHours();
  return h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

let toastTimer;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---------- Iconos (SVG) ----------

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  chevron: svg('<path d="M9 18l6-6-6-6"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', 'width="16" height="16"'),
  x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', 'width="18" height="18"'),
  up: svg('<path d="M18 15l-6-6-6 6"/>', 'width="18" height="18"'),
  down: svg('<path d="M6 9l6 6 6-6"/>', 'width="18" height="18"'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'width="15" height="15"'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 'width="18" height="18"'),
  upload: svg('<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>', 'width="18" height="18"'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/>', 'width="18" height="18"'),
  dumbbell: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>', 'width="40" height="40" stroke-width="1.6"'),
  weight: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>'),
  people: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.8.2 5 2.6 5 5.8"/>'),
  plates: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>'),
  calc: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', 'width="18" height="18"'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>', 'width="18" height="18"'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
  scale: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 9a5 5 0 018 0"/><path d="M12 9l1.5-2"/>', 'width="34" height="34" stroke-width="1.8"'),
  ruler: svg('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>', 'width="18" height="18"'),
  run: svg('<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 12l3-4 4 1 3 3h3M11 15l-1-4"/>', 'width="15" height="15"'),
};

// ---------- Navegación (rutas con #) ----------

const route = () => {
  const [name = 'inicio', id] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'inicio', id };
};

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

const TAB_OF = {
  inicio: 'inicio', ajustes: 'inicio', activo: 'inicio',
  rutinas: 'rutinas', rutina: 'rutinas',
  historial: 'historial', entreno: 'historial', resumen: 'historial',
  progreso: 'progreso',
  cuerpo: 'cuerpo',
};
const NO_TABS = ['activo', 'rutina', 'ajustes', 'resumen'];

let lastRouteKey = '';
let popKey = null; // serie recién completada (para animarla)
let celebrate = null; // id del entrenamiento a celebrar con confeti

function render() {
  const r = route();
  const views = {
    inicio: viewHome, rutinas: viewRoutines, rutina: viewRoutineEditor,
    activo: viewWorkout, historial: viewHistory, entreno: viewWorkoutDetail,
    resumen: viewSummary, progreso: viewProgress, ajustes: viewSettings,
    cuerpo: viewBody,
  };
  const view = views[r.name];
  if (!view) return go('#/inicio');
  if (r.name === 'activo' && !S.state.active) return go('#/inicio');

  const html = view(r);
  popKey = null;
  if (html == null) return; // la vista ha redirigido
  app.innerHTML = html;

  document.body.classList.toggle('no-tabs', NO_TABS.includes(r.name));
  document.querySelectorAll('#tabbar a').forEach((a) =>
    a.classList.toggle('active', a.dataset.tab === TAB_OF[r.name]));

  const key = r.name + '/' + (r.id || '');
  const changed = key !== lastRouteKey;
  if (changed) window.scrollTo(0, 0);
  lastRouteKey = key;

  afterRender(r, changed);
  tick();
}

window.addEventListener('hashchange', render);

// ---------- Casa o gimnasio ----------

const PLACE = {
  gym: { icon: '🏋️', label: 'Gimnasio' },
  home: { icon: '🏠', label: 'Casa' },
  class: { icon: '👥', label: 'Clase' },
};
const PLACE_COLOR = { gym: '#d4ff3a', home: '#4da3ff', class: '#c084fc' };

const placeTag = (p) => `<span class="place-tag ${p}">${PLACE[p].icon} ${PLACE[p].label}</span>`;

function getPosition(timeout = 10000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

/**
 * Decide si el entreno en curso es en casa o en el gimnasio:
 * 1) lugar fijado en la rutina, 2) ubicación del móvil,
 * 3) si no hay ubicación: cerrado → casa, abierto → se pregunta.
 */
async function detectPlace() {
  const a = S.state.active;
  if (!a || a.place) return;
  const st = S.state.settings;
  const coords = st.autoPlace ? await getPosition() : null;
  if (S.state.active?.id !== a.id) return; // el entreno cambió mientras tanto

  if (coords && st.gymLoc) {
    a.place = S.placeFromCoords(coords);
    a.placeSource = 'ubicación';
    toast(a.place === 'gym' ? '📍 Detectado: estás en el gimnasio' : '🏠 Detectado: entrenas fuera del gimnasio');
  } else if (coords) {
    // Primera vez: aprender dónde está el gimnasio
    const yes = await ask('¿Estás ahora mismo en tu gimnasio? Guardaré esta ubicación para detectarlo solo la próxima vez.',
      { ok: 'Sí, en el gym', cancel: 'No, en casa' });
    if (yes) S.saveGymLocation(coords);
    a.place = yes ? 'gym' : 'home';
    a.placeSource = 'ubicación';
    if (yes) toast('📍 Ubicación del gimnasio guardada');
  } else if (!S.gymStatus().open) {
    a.place = 'home';
    a.placeSource = 'horario';
  } else {
    const yes = await ask('¿Dónde entrenas hoy?', { ok: '🏋️ Gimnasio', cancel: '🏠 Casa' });
    a.place = yes ? 'gym' : 'home';
    a.placeSource = 'manual';
  }
  if (S.state.active?.id !== a.id) return;
  S.save();
  if (route().name === 'activo') render();
}

// ---------- Componentes ----------

const stat = (value, label) =>
  `<div class="stat"><span class="v">${value}</span><span class="l">${label}</span></div>`;

const routineCard = (r) => `
  <div class="card routine" style="--rc:${S.routineColor(r)}">
    <a class="info" href="#/rutina/${r.id}">
      <h3>${esc(r.name)}</h3>
      <p>${r.exercises.length} ejercicios · ${esc(r.exercises.map((e) => e.name).join(', '))}</p>
    </a>
    <button class="btn primary sm" data-action="start-routine" data-id="${r.id}">${I.play}Empezar</button>
  </div>`;

function workoutCard(w) {
  const isClass = w.kind === 'class';
  return `
  <a class="card wcard" href="#/entreno/${w.id}" style="--rc:${S.workoutColor(w)}">
    <div class="wc-top">
      <h3>${isClass ? `<span class="tag">Clase</span>` : ''}${esc(w.name)}</h3>
      <span>${cap(date(w.start, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
    </div>
    <div class="wc-meta">
      ${placeTag(S.workoutPlace(w))}
      <span>${I.clock}${duration(w.end - w.start)}</span>
      ${isClass ? '' : `
        ${S.volume(w) ? `<span>${kgShort(S.volume(w))}</span>` : ''}
        <span>${S.setCount(w)} ${S.setCount(w) === 1 ? "serie" : "series"}</span>
        ${w.prs?.length ? `<span class="pr">🏆 ${w.prs.length} PR</span>` : ''}`}
    </div>
    ${isClass ? '' : `<p class="wc-ex">${w.exercises.map((e) => `${e.sets.length}× ${esc(e.name)}`).join(' · ')}</p>`}
  </a>`;
}

const topBar = (title, { back, action = '' } = {}) => `
  <header class="bar">
    <button class="icon-btn" data-action="nav" data-to="${back}" aria-label="Volver">${I.back}</button>
    <strong>${title}</strong>
    <div class="bar-action">${action}</div>
  </header>`;

function gymCard() {
  const g = S.state.settings.gym;
  if (!g.name) return '';
  const st = S.gymStatus();
  const soon = st.open && st.left <= 60;
  const status = st.open
    ? `<span class="dot ${soon ? 'warn' : 'open'}"></span>${soon ? `Cierra en ${st.left} min (${st.closes})` : `Abierto · cierra a las ${st.closes}`}`
    : `<span class="dot"></span>Cerrado · abre ${st.when} a las ${st.opens}`;
  const isViva = S.norm(g.name).includes('vivagym');
  return `
    <section class="card gym">
      <div class="gym-info">
        <strong>${esc(g.name)}</strong>
        <span class="${soon ? 'text-warn' : ''}">${status}</span>
      </div>
      ${isViva ? `<a class="btn sm ghost" href="${VIVAGYM_APP}" target="_blank" rel="noopener">App VivaGym</a>` : ''}
    </section>`;
}

// ---------- Objetivo semanal (anillo) ----------

const RING_C = 2 * Math.PI * 44; // circunferencia del anillo

function goalCard() {
  const goal = S.state.settings.weeklyGoal;
  const week = S.weekWorkouts();
  const count = week.length;
  const streak = S.streak();
  const left = goal - count;
  const offset = RING_C * (1 - Math.min(1, count / goal));

  // Días de la semana: L M X J V S D
  const monday = S.startOfWeek();
  const todayKey = S.dayKey(new Date());
  const days = 'LMXJVSD'.split('').map((letter, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const w = week.find((x) => S.dayKey(new Date(x.start)) === S.dayKey(d));
    const cls = [w ? 'on' : '', S.dayKey(d) === todayKey ? 'today' : ''].join(' ');
    return `<span class="${cls}" ${w ? `style="background:${S.workoutColor(w)}"` : ''}>${letter}</span>`;
  }).join('');

  return `
    <section class="card goal">
      <div class="ring">
        <svg viewBox="0 0 104 104" aria-hidden="true">
          <circle class="track" cx="52" cy="52" r="44" fill="none" stroke-width="10"/>
          <circle class="fill" cx="52" cy="52" r="44" fill="none" stroke-width="10"
            stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}" data-offset="${offset}"/>
        </svg>
        <div class="ring-label"><strong>${count}</strong><small>de ${goal}</small></div>
      </div>
      <div class="goal-text">
        <h3>${left <= 0 ? '¡Objetivo cumplido! 🎉' : 'Objetivo semanal'}</h3>
        <p>${left <= 0
          ? `Llevas ${count} ${count === 1 ? 'entreno' : 'entrenos'} esta semana`
          : `Te ${left === 1 ? 'falta 1 entreno' : `faltan ${left} entrenos`}`}</p>
        ${streak ? `<span class="streak">🔥 ${streak} ${streak === 1 ? 'semana cumpliendo' : 'semanas seguidas'}</span>` : ''}
        <div class="goal-days">${days}</div>
      </div>
    </section>`;
}

/** Anima el anillo desde 0 hasta su valor */
function animateRing(animate) {
  const ring = app.querySelector('.ring .fill');
  if (!ring) return;
  if (!animate) {
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = ring.dataset.offset;
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => (ring.style.strokeDashoffset = ring.dataset.offset)));
}

// ---------- Calendario de constancia ----------

function heatmap(weeks = 17) {
  const mins = S.dailyMinutes();
  const start = S.startOfWeek();
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cells = '';
  let months = '';
  let trained = 0;
  let prevMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const monday = new Date(start);
    monday.setDate(start.getDate() + 7 * w);
    if (monday.getMonth() !== prevMonth) {
      const later = new Date(monday);
      later.setDate(later.getDate() + 14);
      // no poner etiqueta si el mes apenas asoma al principio
      if (w > 0 || later.getMonth() === monday.getMonth()) {
        months += `<span style="grid-column:${w + 1}">${cap(date(monday, { month: 'short' }).replace('.', ''))}</span>`;
      }
      prevMonth = monday.getMonth();
    }
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      const m = mins.get(S.dayKey(day)) || 0;
      if (m) trained++;
      const lvl = !m ? 0 : m < 40 ? 1 : m < 70 ? 2 : 3;
      const cls = day > today ? 'future' : `h${lvl}${+day === +today ? ' today' : ''}`;
      cells += `<i class="${cls}" title="${date(day, { day: 'numeric', month: 'short' })}: ${m} min"></i>`;
    }
  }
  const sw = (bg) => `<i style="background:${bg}"></i>`;
  return `
    <div class="heat-wrap">
      <div class="heat-months" style="grid-template-columns:repeat(${weeks},1fr)">${months}</div>
      <div class="heat">
        <div class="heat-days"><span>L</span><span></span><span>X</span><span></span><span>V</span><span></span><span>D</span></div>
        <div class="heat-grid">${cells}</div>
      </div>
    </div>
    <div class="heat-foot">
      <span><strong>${trained}</strong> días entrenados</span>
      <div class="legend">Menos${sw('var(--surface-2)')}${sw('rgba(212,255,58,.3)')}${sw('rgba(212,255,58,.62)')}${sw('var(--accent)')}Más</div>
    </div>`;
}

// ---------- Confeti ----------

function confetti(power = 1) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.getElementById('confetti')?.remove();
  const c = document.createElement('canvas');
  c.id = 'confetti';
  document.body.appendChild(c);
  const W = innerWidth;
  const H = innerHeight;
  const dpr = devicePixelRatio || 1;
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#d4ff3a', '#ff8a3d', '#4da3ff', '#3ddc84', '#c084fc', '#ff5f7e', '#ffd43b'];
  const parts = Array.from({ length: Math.round(150 * power) }, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H * 0.28,
    vx: (Math.random() - 0.5) * 15,
    vy: -Math.random() * 15 - 5,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    w: 6 + Math.random() * 5,
    h: 9 + Math.random() * 8,
    c: colors[i % colors.length],
  }));
  const t0 = performance.now();
  const frame = (t) => {
    const el = t - t0;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, 1 - el / 3200);
    for (const p of parts) {
      p.vy += 0.38;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    }
    if (el < 3200) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}

// ---------- Pantalla: Inicio ----------

function viewHome() {
  const { active, routines, workouts } = S.state;
  const w = S.weekStats();
  return `
    <header class="top">
      <div>
        <p class="eyebrow">${esc(cap(date(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })))}</p>
        <h1>${greeting()}</h1>
      </div>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${I.gear}</a>
    </header>

    ${active ? `
      <button class="banner" data-action="nav" data-to="#/activo">
        <span class="pulse"></span>
        <span class="banner-text"><strong>Entrenamiento en curso</strong>
        <small>${esc(active.name)} · <span data-elapsed></span></small></span>
        ${I.chevron}
      </button>` : ''}

    ${goalCard()}

    <div class="stats mt">
      ${stat(kgShort(w.volume), 'Volumen semana')}
      ${stat(w.minutes, 'Minutos semana')}
      ${S.state.weights.length
        ? `<a class="stat" href="#/cuerpo"><span class="v">${num(S.weightTrend().at(-1).trend, 1)}</span><span class="l">Peso (kg)</span></a>`
        : stat(w.total, 'Entrenos totales')}
    </div>

    <div class="mt">${gymCard()}</div>

    <div class="quick mt">
      <button class="tile" data-action="start-empty">${I.weight}<span>Entreno libre</span></button>
      <button class="tile" data-action="open-class">${I.people}<span>Clase colectiva</span></button>
      <button class="tile" data-action="open-plates">${I.plates}<span>Discos</span></button>
    </div>

    <h2 class="section-title">Tus rutinas</h2>
    <div class="stack">
      ${routines.length ? routines.map(routineCard).join('') :
        '<a class="btn ghost block" href="#/rutinas">Crea tu primera rutina</a>'}
    </div>

    ${workouts[0] ? `
      <h2 class="section-title">Último entrenamiento</h2>
      ${workoutCard(workouts[0])}` : ''}
  `;
}

// ---------- Pantalla: Entrenamiento en curso ----------

function suggestionRow(ex, i) {
  if (isCardio(ex)) return '';
  const kg = S.suggestKg(ex.name, ex.sets);
  if (!kg || !ex.sets.some((s) => !s.done && s.kg === '')) return '';
  return `
    <div class="suggest">
      ${I.bulb}
      <span>La última vez completaste todas las reps. Prueba con <strong>${num(kg, 2)} kg</strong></span>
      <button class="btn sm" data-action="apply-suggest" data-ex="${i}" data-kg="${kg}">Aplicar</button>
    </div>`;
}

function setRows(ex, i) {
  const prev = S.lastSets(ex.name);
  const cardio = isCardio(ex);
  const [fa, fb] = cardio ? ['min', 'km'] : ['kg', 'reps'];
  return ex.sets.map((s, j) => {
    const p = prev?.[j];
    let phA, phB, prevText;
    if (cardio) {
      phA = p?.min ?? s.target ?? '';
      phB = p?.km || '';
      prevText = p ? `${num(p.min)}′${p.km ? ` · ${num(p.km, 2)} km` : ''}` : '—';
    } else {
      phA = p ? p.kg : '';
      phB = p ? p.reps : s.target ?? '';
      prevText = p ? `${num(p.kg)} × ${p.reps}` : '—';
    }
    return `
      <div class="set-row ${s.done ? 'done' : ''} ${popKey === `${i}-${j}` ? 'pop' : ''}">
        <span class="set-n">${j + 1}</span>
        <span class="prev">${prevText}</span>
        <input class="num" type="number" inputmode="decimal" step="any" min="0"
          placeholder="${phA}" value="${esc(s[fa] ?? '')}" data-field="${fa}" data-ex="${i}" data-set="${j}" aria-label="${fa} serie ${j + 1}">
        <input class="num" type="number" inputmode="${cardio ? 'decimal' : 'numeric'}" step="any" min="0"
          placeholder="${phB}" value="${esc(s[fb] ?? '')}" data-field="${fb}" data-ex="${i}" data-set="${j}" aria-label="${fb} serie ${j + 1}">
        <button class="check" data-action="toggle-set" data-ex="${i}" data-set="${j}" aria-label="Completar serie ${j + 1}">${I.check}</button>
      </div>`;
  }).join('');
}

function exerciseCard(ex, i) {
  const cardio = isCardio(ex);
  return `
    <section class="card ex-card">
      <div class="ex-head">
        <h3>${esc(ex.name)}${cardio ? '<span class="tag">Cardio</span>' : ''}</h3>
        <div class="ex-tools">
          ${cardio ? '' : `<button class="icon-btn sm ghost" data-action="open-plates" data-ex="${i}" aria-label="Calcular discos">${I.calc}</button>`}
          <button class="icon-btn sm ghost" data-action="remove-exercise" data-ex="${i}" aria-label="Quitar ejercicio">${I.trash}</button>
        </div>
      </div>
      ${suggestionRow(ex, i)}
      <div class="set-row set-head"><span>${cardio ? 'Bloque' : 'Serie'}</span><span>Anterior</span><span>${cardio ? 'Min' : 'kg'}</span><span>${cardio ? 'Km' : 'Reps'}</span><span></span></div>
      ${setRows(ex, i)}
      <div class="ex-foot">
        <button class="btn sm" data-action="add-set" data-ex="${i}">${I.plus}${cardio ? 'Bloque' : 'Serie'}</button>
        <button class="btn sm ghost" data-action="remove-set" data-ex="${i}" ${ex.sets.length < 2 ? 'disabled' : ''}>Quitar</button>
      </div>
    </section>`;
}

function viewWorkout() {
  const a = S.state.active;
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  return `
    <header class="bar sticky">
      <button class="icon-btn" data-action="nav" data-to="#/inicio" aria-label="Minimizar">${I.down}</button>
      <div class="bar-center">
        <strong>${esc(a.name)}</strong>
        <small><span data-elapsed></span> · ${done}/${total} series</small>
      </div>
      <div class="bar-action"><button class="btn primary sm" data-action="finish">Terminar</button></div>
    </header>
    <div class="progress"><i style="width:${total ? (done / total) * 100 : 0}%;background:${S.workoutColor(a)}"></i></div>
    <div class="place-row">
      ${a.place
        ? `<button class="place-chip ${a.place}" data-action="toggle-place">${PLACE[a.place].icon} ${PLACE[a.place].label}<small>Cambiar</small></button>
           <span class="muted">${{ 'ubicación': 'Detectado por ubicación', rutina: 'Según la rutina', horario: 'El gimnasio está cerrado', manual: 'Elegido por ti' }[a.placeSource] || ''}</span>`
        : '<span class="place-chip pending">📍 Detectando dónde entrenas…</span>'}
    </div>

    <div class="stack">
      ${a.exercises.map(exerciseCard).join('')}
    </div>
    ${a.exercises.length ? '' : `
      <div class="empty">${I.dumbbell}<p>Añade tu primer ejercicio para empezar</p></div>`}

    <button class="btn block ghost mt" data-action="open-picker" data-ctx="workout">${I.plus}Añadir ejercicio</button>
    <button class="btn block text-danger mt" data-action="cancel-workout">Descartar entrenamiento</button>
  `;
}

// ---------- Pantalla: Rutinas ----------

function viewRoutines() {
  const { routines } = S.state;
  return `
    <header class="top">
      <div><p class="eyebrow">Planifica</p><h1>Rutinas</h1></div>
      <button class="icon-btn accent" data-action="new-routine" aria-label="Nueva rutina">${I.plus}</button>
    </header>
    <div class="stack">
      ${routines.length ? routines.map(routineCard).join('') : `
        <div class="empty">${I.dumbbell}<p>Aún no tienes rutinas</p>
        <button class="btn primary" data-action="new-routine">Crear rutina</button></div>`}
    </div>
  `;
}

// Borrador de la rutina que se está editando (para poder cancelar)
let draft = null;

function viewRoutineEditor({ id }) {
  if (!draft || draft.id !== id) {
    const r = S.state.routines.find((x) => x.id === id);
    if (!r) { go('#/rutinas'); return null; }
    draft = { ...structuredClone(r), color: S.routineColor(r), isNew: false, dirty: false };
  }
  const d = draft;
  return `
    ${topBar(d.isNew ? 'Nueva rutina' : 'Editar rutina', {
      back: '#/rutinas',
      action: '<button class="btn primary sm" data-action="save-routine">Guardar</button>',
    })}

    <label class="field">
      <span>Nombre</span>
      <input class="input" data-field="r-name" value="${esc(d.name)}" placeholder="Ej. Torso A" maxlength="40" autocomplete="off">
    </label>

    <div class="field mt">
      <span>Dónde la haces</span>
      <div class="seg" id="r-place">
        ${[['', '📍 Automático'], ['gym', '🏋️ Gimnasio'], ['home', '🏠 Casa']].map(([v, l]) =>
          `<button class="${(d.place || '') === v ? 'on' : ''}" data-action="r-place" data-p="${v}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="field mt">
      <span>Color</span>
      <div class="swatches">
        ${S.PALETTE.map((c) => `<button class="swatch ${c === S.routineColor(d) ? 'on' : ''}" style="--c:${c}" data-action="r-color" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}
      </div>
    </div>

    <h2 class="section-title">Ejercicios</h2>
    <div class="stack">
      ${d.exercises.map((e, i) => {
        const cardio = S.exerciseType(e.name) === 'cardio';
        return `
        <div class="card ed-card">
          <div class="ed-top">
            <strong>${esc(e.name)}${cardio ? '<span class="tag">Cardio</span>' : ''}</strong>
            <div class="ed-tools">
              <button class="icon-btn sm ghost" data-action="r-move" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${I.up}</button>
              <button class="icon-btn sm ghost" data-action="r-move" data-i="${i}" data-dir="1" ${i === d.exercises.length - 1 ? 'disabled' : ''} aria-label="Bajar">${I.down}</button>
              <button class="icon-btn sm ghost" data-action="r-remove" data-i="${i}" aria-label="Quitar">${I.trash}</button>
            </div>
          </div>
          <div class="ed-fields">
            <label>${cardio ? 'Bloques' : 'Series'}
              <input class="num" type="number" inputmode="numeric" min="1" max="20" value="${e.sets}" data-field="r-sets" data-i="${i}">
            </label>
            <label>${cardio ? 'Minutos' : 'Reps objetivo'}
              <input class="num" type="number" inputmode="numeric" min="1" max="300" value="${e.reps}" data-field="r-reps" data-i="${i}">
            </label>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${d.exercises.length ? '' : '<p class="hint">Añade los ejercicios en el orden en que los haces.</p>'}

    <button class="btn block ghost mt" data-action="open-picker" data-ctx="routine">${I.plus}Añadir ejercicio</button>
    ${d.isNew ? '' : '<button class="btn block text-danger mt" data-action="delete-routine">Eliminar rutina</button>'}
  `;
}

// ---------- Pantalla: Historial ----------

// --- Calendario mensual ---

let calMonth = null; // primer día del mes mostrado
let calSel = null; // día seleccionado (clave AAAA-M-D)

function calendar() {
  const now = new Date();
  const cm = calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
  const y = cm.getFullYear();
  const m = cm.getMonth();
  const byDay = S.workoutsByDay();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = S.dayKey(now);
  const isCurrent = y === now.getFullYear() && m === now.getMonth();

  const count = { gym: 0, home: 0, class: 0 };
  let activeDays = 0;
  let cells = '<i class="cal-empty"></i>'.repeat(offset);
  for (let d = 1; d <= days; d++) {
    const day = new Date(y, m, d);
    const k = S.dayKey(day);
    const ws = byDay.get(k) || [];
    ws.forEach((w) => count[S.workoutPlace(w)]++);
    const types = [...new Set(ws.map(S.workoutPlace))];
    if (types.length) activeDays++;
    const cols = types.map((t) => PLACE_COLOR[t]);
    const bg = cols.length === 1 ? cols[0]
      : cols.length ? `linear-gradient(135deg, ${cols.map((c, i) => `${c} ${(i / cols.length) * 100}% ${((i + 1) / cols.length) * 100}%`).join(', ')})` : '';
    const future = day > now;
    cells += `<button class="cal-day ${types.length ? 'has' : ''} ${k === todayKey ? 'today' : ''} ${calSel === k ? 'sel' : ''}"
      ${bg ? `style="--bg:${bg}"` : ''} data-action="cal-day" data-k="${k}" ${future ? 'disabled' : ''}
      aria-label="${d}: ${types.length ? types.map((t) => PLACE[t].label).join(' y ') : 'sin entreno'}">${d}</button>`;
  }

  // Detalle del día seleccionado
  let selHtml = '';
  if (calSel) {
    const [sy, sm] = calSel.split('-').map(Number);
    if (sy === y && sm === m) {
      const ws = byDay.get(calSel) || [];
      const [, , sd] = calSel.split('-').map(Number);
      const title = cap(date(new Date(y, m, sd), { weekday: 'long', day: 'numeric', month: 'long' }));
      selHtml = `
        <div class="cal-sel">
          <h3>${title}</h3>
          ${ws.length ? `<div class="stack">${ws.map(workoutCard).join('')}</div>` : '<p class="hint" style="margin:0">Día de descanso 😴</p>'}
        </div>`;
    }
  }

  return `
    <section class="card cal">
      <div class="cal-head">
        <button class="icon-btn sm ghost" data-action="cal-nav" data-d="-1" aria-label="Mes anterior">${I.back}</button>
        <strong>${cap(date(cm, { month: 'long', year: 'numeric' }))}</strong>
        <button class="icon-btn sm ghost" data-action="cal-nav" data-d="1" ${isCurrent ? 'disabled' : ''} aria-label="Mes siguiente">${I.chevron}</button>
      </div>
      <div class="cal-grid cal-week">${'LMXJVSD'.split('').map((l) => `<span>${l}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-sum">
        <span><i style="background:${PLACE_COLOR.gym}"></i>Gimnasio <b>${count.gym}</b></span>
        <span><i style="background:${PLACE_COLOR.home}"></i>Casa <b>${count.home}</b></span>
        <span><i style="background:${PLACE_COLOR.class}"></i>Clases <b>${count.class}</b></span>
      </div>
      <p class="cal-foot">${activeDays} ${activeDays === 1 ? 'día activo' : 'días activos'} este mes</p>
      ${selHtml}
    </section>`;
}

function viewHistory() {
  const { workouts } = S.state;
  if (!workouts.length) {
    return `
      <header class="top"><div><p class="eyebrow">Tu registro</p><h1>Historial</h1></div></header>
      <div class="empty">${I.dumbbell}<p>Todavía no has guardado ningún entrenamiento</p>
      <a class="btn primary" href="#/inicio">Empezar uno</a></div>`;
  }
  const groups = new Map();
  for (const w of workouts) {
    const k = cap(date(w.start, { month: 'long', year: 'numeric' }));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  return `
    <header class="top"><div><p class="eyebrow">Tu registro</p><h1>Historial</h1></div></header>
    ${calendar()}
    ${[...groups].map(([month, ws]) => `
      <h2 class="section-title">${month} <span class="count">${ws.length}</span></h2>
      <div class="stack">${ws.map(workoutCard).join('')}</div>`).join('')}
  `;
}

function detailSets(e) {
  if (S.exerciseType(e.name) === 'cardio') {
    return e.sets.map((s, j) => `
      <li><span class="set-n">${j + 1}</span>
      <strong>${num(s.min)} min${s.km ? ` · ${num(s.km, 2)} km` : ''}</strong>
      <span class="muted">${pace(s.min, s.km)}</span></li>`).join('');
  }
  return e.sets.map((s, j) => `
    <li><span class="set-n">${j + 1}</span>
    <strong>${num(s.kg)} kg × ${s.reps}</strong>
    <span class="muted">${s.kg ? `1RM ${num(S.est1RM(s.kg, s.reps), 0)}` : ''}</span></li>`).join('');
}

function viewWorkoutDetail({ id }) {
  const w = S.state.workouts.find((x) => x.id === id);
  if (!w) { go('#/historial'); return null; }
  const isClass = w.kind === 'class';
  const prs = new Set((w.prs || []).map(S.norm));
  return `
    ${topBar(isClass ? 'Clase' : 'Entrenamiento', { back: '#/historial' })}
    <div class="detail-head">
      <h1>${esc(w.name)}</h1>
      <p class="eyebrow">${esc(cap(date(w.start, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })))}</p>
      ${isClass ? placeTag('class') : `
        <button class="place-chip ${S.workoutPlace(w)} mt" data-action="set-place" data-id="${w.id}">
          ${PLACE[S.workoutPlace(w)].icon} ${PLACE[S.workoutPlace(w)].label}<small>Cambiar</small></button>`}
    </div>
    <div class="stats">
      ${stat(duration(w.end - w.start), 'Duración')}
      ${isClass
        ? stat('Clase', 'Tipo') + stat(date(w.end, { hour: '2-digit', minute: '2-digit' }), 'Hora de fin')
        : stat(kgShort(S.volume(w)), 'Volumen') + stat(S.setCount(w), 'Series')}
    </div>

    ${isClass ? '' : `
    <div class="stack mt">
      ${w.exercises.map((e) => `
        <section class="card">
          <div class="ex-head">
            <h3>${esc(e.name)}</h3>
            ${prs.has(S.norm(e.name)) ? '<span class="pr">🏆 Récord</span>' : ''}
          </div>
          <ol class="set-list">${detailSets(e)}</ol>
        </section>`).join('')}
    </div>
    ${musclesCard(muscleSets([w]), 'Músculos trabajados', [2, 4])}

    <button class="btn block primary mt" data-action="repeat-workout" data-id="${w.id}">${I.repeat}Repetir entrenamiento</button>`}
    <button class="btn block text-danger mt" data-action="delete-workout" data-id="${w.id}">Eliminar del historial</button>
  `;
}

/** Tarjeta con el mapa muscular. steps: series para nivel medio y alto */
function musclesCard(sets, title, steps, extra = '') {
  if (!Object.values(sets).some((n) => n > 0)) return '';
  const sw = (bg) => `<i style="background:${bg}"></i>`;
  return `
    <section class="card mt">
      <h2 class="card-title">${title}</h2>
      ${extra}
      ${bodyMap(sets, steps)}
      <div class="legend">Menos${sw('#353b42')}${sw('rgba(212,255,58,.3)')}${sw('rgba(212,255,58,.62)')}${sw('var(--accent)')}Más series</div>
      ${muscleList(sets)}
    </section>`;
}

// ---------- Pantalla: Resumen al terminar ----------

function viewSummary({ id }) {
  const w = S.state.workouts.find((x) => x.id === id);
  if (!w) { go('#/historial'); return null; }
  const isClass = w.kind === 'class';
  const prs = w.prDetails || (w.prs || []).map((name) => ({ name }));
  const goal = S.state.settings.weeklyGoal;
  const count = S.weekWorkouts().length;
  const reached = count >= goal;

  return `
    <div class="summary" style="--rc:${S.workoutColor(w)}">
      <div class="badge">${prs.length ? '🏆' : reached ? '🎯' : '💪'}</div>
      <h1>${prs.length ? '¡Nuevo récord!' : '¡Buen trabajo!'}</h1>
      <p class="sub">Has completado <b>${esc(w.name)}</b></p>
      <div class="big-stats">
        ${stat(duration(w.end - w.start), 'Duración')}
        ${isClass
          ? stat('Clase', 'Colectiva')
          : stat(kgShort(S.volume(w)), 'Volumen') + stat(S.setCount(w), 'Series') + stat(prs.length, 'Récords')}
      </div>
    </div>

    ${prs.length ? `
      <section class="card pr-card mt">
        <h2 class="card-title">🏆 Récords personales</h2>
        <ul>${prs.map((p) => `
          <li><span>${esc(p.name)}</span>
          <span>${p.kg != null ? `<b>${num(p.kg)} kg</b>` : ''} ${p.prev != null ? `<small>antes ${num(p.prev)} kg</small>` : ''}</span></li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="card mt">
      <h2 class="card-title">${reached ? '¡Objetivo semanal cumplido! 🎉' : 'Objetivo semanal'}</h2>
      <div class="progress" style="height:10px;border-radius:6px;margin:4px 0 8px"><i style="width:${Math.min(100, (count / goal) * 100)}%"></i></div>
      <p class="hint" style="margin:0">${count} de ${goal} entrenos esta semana${reached ? '' : ` · te ${goal - count === 1 ? 'falta 1' : `faltan ${goal - count}`}`}</p>
    </section>

    ${isClass ? '' : musclesCard(muscleSets([w]), 'Músculos trabajados', [2, 4])}

    <a class="btn block primary mt" href="#/inicio">Volver al inicio</a>
    <a class="btn block ghost mt" href="#/entreno/${w.id}">Ver detalle</a>
  `;
}

// ---------- Pantalla: Progreso ----------

let progressEx = null;
let progressMetric = 'rm';
let muscleRange = 'week';
const METRICS = {
  strength: {
    rm: { label: '1RM est.', unit: 'kg' },
    kg: { label: 'Peso máx.', unit: 'kg' },
    vol: { label: 'Volumen', unit: 'kg' },
  },
  cardio: {
    km: { label: 'Distancia', unit: 'km' },
    min: { label: 'Tiempo', unit: 'min' },
  },
};

function viewProgress() {
  const names = S.trackedExercises();
  const header = '<header class="top"><div><p class="eyebrow">Tu evolución</p><h1>Progreso</h1></div></header>';
  if (!S.state.workouts.length) {
    return `${header}
      <div class="empty">${I.dumbbell}<p>Completa tu primer entrenamiento para ver aquí tu progreso</p></div>`;
  }
  // Músculos: esta semana o últimas 4 semanas
  const since = new Date();
  since.setDate(since.getDate() - 28);
  const range = muscleRange === 'week'
    ? S.weekWorkouts()
    : S.state.workouts.filter((w) => w.start >= since.getTime());
  const rangeSeg = `
    <div class="seg" style="margin-bottom:12px">
      <button class="${muscleRange === 'week' ? 'on' : ''}" data-action="muscle-range" data-r="week">Esta semana</button>
      <button class="${muscleRange === 'month' ? 'on' : ''}" data-action="muscle-range" data-r="month">4 semanas</button>
    </div>`;
  const msets = muscleSets(range);
  const muscles = musclesCard(msets, 'Músculos trabajados', muscleRange === 'week' ? [4, 10] : [16, 40], rangeSeg) ||
    `<section class="card mt"><h2 class="card-title">Músculos trabajados</h2>${rangeSeg}<p class="hint">Sin series de fuerza en este periodo.</p></section>`;

  const weeks = `
    <section class="card">
      <h2 class="card-title">Constancia</h2>
      ${heatmap()}
    </section>
    ${muscles}
    <section class="card mt">
      <h2 class="card-title">Entrenamientos por semana</h2>
      <canvas id="ch-weeks"></canvas>
    </section>`;
  if (!names.length) return header + weeks;

  if (!progressEx || !names.some((n) => S.norm(n) === S.norm(progressEx))) progressEx = names[0];
  const type = S.exerciseType(progressEx);
  const metrics = METRICS[type];
  if (!metrics[progressMetric]) progressMetric = Object.keys(metrics)[0];
  const hist = S.exerciseHistory(progressEx);

  const stats = type === 'cardio'
    ? stat(`${num(Math.max(...hist.map((h) => h.km)), 2)} km`, 'Mejor distancia') +
      stat(`${num(hist.reduce((a, h) => a + h.min, 0), 0)}′`, 'Tiempo total') +
      stat(hist.length, 'Sesiones')
    : stat(`${num(Math.max(...hist.map((h) => h.kg)))} kg`, 'Peso máximo') +
      stat(`${num(Math.max(...hist.map((h) => h.rm)), 0)} kg`, '1RM estimado') +
      stat(hist.length, 'Sesiones');

  return `${header}${weeks}
    <h2 class="section-title">Por ejercicio</h2>
    <section class="card">
      <select class="input" data-field="progress-ex" aria-label="Ejercicio">
        ${names.map((n) => `<option value="${esc(n)}" ${n === progressEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}
      </select>
      <div class="seg mt" role="tablist">
        ${Object.entries(metrics).map(([k, m]) =>
          `<button class="${k === progressMetric ? 'on' : ''}" data-action="metric" data-m="${k}">${m.label}</button>`).join('')}
      </div>
      <canvas id="ch-ex" class="mt"></canvas>
      <div class="stats mt">${stats}</div>
    </section>
  `;
}

// ---------- Pantalla: Cuerpo ----------

let bodyRange = 90; // días visibles en la gráfica (0 = todo)
let bodyShowAll = false;

const signed = (v, d = 1, unit = 'kg') =>
  v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), d)} ${unit}`;

/** Color de un cambio de peso según vaya hacia el objetivo o no */
function deltaClass(v, b) {
  if (v == null || Math.abs(v) < 0.05 || !b.goal || b.trend == null) return '';
  return Math.sign(v) === Math.sign(b.goal - b.trend) ? 'good' : 'bad';
}

function bmiScale(bmi) {
  const pos = Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100));
  return `<div class="scale-bar"><i style="left:${pos}%"></i></div>
    <div class="scale-labels"><span>18,5</span><span>25</span><span>30</span></div>`;
}

function viewBody() {
  const p = S.state.profile;
  const header = `
    <header class="top">
      <div><p class="eyebrow">Peso, medidas y composición</p><h1>Cuerpo</h1></div>
      ${p ? `<button class="icon-btn" data-action="open-profile" aria-label="Editar perfil">${I.user}</button>` : ''}
    </header>`;

  if (!p) {
    return `${header}
      <section class="card onboard">
        <div class="onboard-icon">${I.scale}</div>
        <h2>Configura tu perfil</h2>
        <p class="hint">Con tu sexo, edad y altura calculo tu IMC, tu porcentaje de grasa, tu masa magra y tu gasto calórico diario.</p>
        <button class="btn primary block mt" data-action="open-profile">Empezar</button>
      </section>`;
  }

  const b = S.bodyStats();
  const last = b.last;

  // --- Tarjeta principal de peso ---
  const ranges = [[30, '1M'], [90, '3M'], [180, '6M'], [365, '1A'], [0, 'Todo']];
  const hero = last ? `
    <section class="card weight-hero">
      <div class="wh-top">
        <div>
          <p class="eyebrow">Peso de tendencia</p>
          <div class="wh-big">${num(b.trend, 1)}<span>kg</span></div>
          <p class="wh-sub">Última pesada: ${num(last.kg, 1)} kg · ${date(S.ymdTime(last.date), { day: 'numeric', month: 'short' })}</p>
        </div>
        <button class="btn primary sm" data-action="open-weight">${I.plus}Peso</button>
      </div>
      <div class="deltas">
        <div class="delta ${deltaClass(b.change7, b)}"><small>7 días</small><strong>${signed(b.change7)}</strong></div>
        <div class="delta ${deltaClass(b.change30, b)}"><small>30 días</small><strong>${signed(b.change30)}</strong></div>
        <div class="delta ${deltaClass(b.rate, b)}"><small>Por semana</small><strong>${b.rate == null ? '—' : signed(b.rate, 2)}</strong></div>
      </div>
      <div class="seg mt">
        ${ranges.map(([d, l]) => `<button class="${d === bodyRange ? 'on' : ''}" data-action="body-range" data-d="${d}">${l}</button>`).join('')}
      </div>
      <canvas id="ch-body" class="mt"></canvas>
      <p class="chart-key"><span class="k-dot"></span>Pesadas <span class="k-line"></span>Tendencia${b.goal ? '<span class="k-goal"></span>Objetivo' : ''}</p>
    </section>` : `
    <section class="card onboard">
      <div class="onboard-icon">${I.scale}</div>
      <h2>Registra tu primer peso</h2>
      <p class="hint">Pésate por la mañana, después de ir al baño y antes de desayunar. Así los datos son comparables entre días.</p>
      <button class="btn primary block mt" data-action="open-weight">${I.plus}Registrar peso</button>
    </section>`;

  // --- Objetivo ---
  let goalHtml = '';
  if (b.goal && last) {
    const startKg = b.start.trend;
    const total = b.goal - startKg;
    const done = b.trend - startKg;
    const pct = total ? Math.min(100, Math.max(0, (done / total) * 100)) : 100;
    const left = b.goal - b.trend;
    let msg;
    if (Math.abs(left) < 0.3) msg = '¡Has llegado a tu objetivo! 🎉';
    else if (b.eta) {
      const wks = Math.round(b.eta.weeks);
      msg = `A tu ritmo actual lo alcanzarías en <strong>${wks <= 1 ? '1 semana' : `${wks} semanas`}</strong> (${date(b.eta.date, { day: 'numeric', month: 'long' })}).`;
    } else if (b.rate == null) msg = 'Necesito unas dos semanas de pesadas para calcular tu ritmo.';
    else msg = 'Tu tendencia actual no va hacia el objetivo.';
    goalHtml = `
      <section class="card mt">
        <div class="goal-head">
          <h2 class="card-title" style="margin:0">Objetivo: ${num(b.goal, 1)} kg</h2>
          <span class="muted">${Math.abs(left) < 0.3 ? '' : `Quedan ${num(Math.abs(left), 1)} kg`}</span>
        </div>
        <div class="progress big"><i style="width:${pct}%;background:var(--ok)"></i></div>
        <div class="goal-ends"><span>Inicio ${num(startKg, 1)} kg</span><span>${Math.round(pct)} %</span></div>
        <p class="hint">${msg}</p>
      </section>`;
  }

  // --- Composición corporal ---
  const metric = (label, value, unit, extra = '', chip = null) => `
    <div class="metric">
      <span class="m-label">${label}</span>
      <span class="m-value">${value}${value !== '—' && unit ? `<small>${unit}</small>` : ''}</span>
      ${chip ? `<span class="chip-s ${chip[1]}">${chip[0]}</span>` : ''}
      ${extra}
    </div>`;
  const comp = `
    <h2 class="section-title">Composición corporal</h2>
    <div class="metrics">
      ${metric('IMC', b.bmi ? num(b.bmi, 1) : '—', '', b.bmi ? bmiScale(b.bmi) : '', b.bmiCat)}
      ${metric('Grasa corporal', b.fat != null ? num(b.fat, 1) : '—', '%',
        `<span class="m-note">${b.fatSource === 'navy' ? 'Método Marina EE. UU.' : b.fatSource === 'scale' ? 'Según tu báscula' : 'Añade cuello y cintura' + (p.sex === 'f' ? ' y cadera' : '')}</span>`, b.fatCat)}
      ${metric('Masa magra', b.lean ? num(b.lean, 1) : '—', 'kg', b.lean ? `<span class="m-note">${num(b.trend - b.lean, 1)} kg de grasa</span>` : '')}
      ${metric('FFMI', b.ffmi ? num(b.ffmi, 1) : '—', '', `<span class="m-note">Índice de masa libre de grasa</span>`)}
      ${metric('Metabolismo basal', b.bmr ? num(b.bmr, 0) : '—', 'kcal', '<span class="m-note">Mifflin-St Jeor</span>')}
      ${metric('Mantenimiento', b.tdee ? num(Math.round(b.tdee / 10) * 10, 0) : '—', 'kcal/día',
        `<span class="m-note">Actividad: ${(S.ACTIVITY.find((a) => a[0] === p.activity) || S.ACTIVITY[2])[1].toLowerCase()}</span>`)}
    </div>`;

  // --- Medidas ---
  const measureRows = Object.entries(S.MEASURES).map(([k, label]) => {
    const series = S.measureSeries(k);
    if (!series.length) return '';
    const cur = series[series.length - 1].y;
    const prev = series.length > 1 ? series[series.length - 2].y : null;
    const diff = prev != null ? cur - prev : null;
    return `
      <li>
        <span class="mr-name">${label}</span>
        ${sparkline(series.map((s) => s.y))}
        <span class="mr-val">${num(cur, 1)} <small>cm</small></span>
        <span class="mr-diff">${diff ? signed(diff, 1, '') : ''}</span>
      </li>`;
  }).join('');
  const measures = `
    <h2 class="section-title">Medidas</h2>
    <section class="card">
      ${measureRows ? `<ul class="measure-list">${measureRows}</ul>` :
        '<p class="hint" style="margin:0 0 12px">Mide tu contorno cada 2-4 semanas: la cintura dice mucho más que la báscula.</p>'}
      <button class="btn block ${measureRows ? 'ghost mt' : 'primary'}" data-action="open-measures">${I.ruler}Registrar medidas</button>
      ${S.state.measures.length ? `
        <details class="records">
          <summary>Ver registros (${S.state.measures.length})</summary>
          ${[...S.state.measures].reverse().map((m) => `
            <div class="rec">
              <div><strong>${cap(date(S.ymdTime(m.date), { day: 'numeric', month: 'short', year: 'numeric' }))}</strong>
              <small>${Object.entries(S.MEASURES).filter(([k]) => m[k]).map(([k, l]) => `${l} ${num(m[k], 1)}`).join(' · ')}</small></div>
              <button class="icon-btn sm ghost" data-action="delete-measures" data-id="${m.id}" aria-label="Eliminar">${I.trash}</button>
            </div>`).join('')}
        </details>` : ''}
    </section>`;

  // --- Historial de pesadas ---
  const series = [...b.series].reverse();
  const shown = bodyShowAll ? series : series.slice(0, 7);
  const history = series.length ? `
    <h2 class="section-title">Pesadas <span class="count">${series.length}</span></h2>
    <section class="card weigh-list">
      ${shown.map((w) => {
        const i = series.indexOf(w);
        const prev = series[i + 1];
        const diff = prev ? w.kg - prev.kg : null;
        return `
          <div class="rec">
            <div><strong>${num(w.kg, 1)} kg</strong>
            <small>${cap(date(w.t, { weekday: 'short', day: 'numeric', month: 'short' }))}${w.fat ? ` · ${num(w.fat, 1)} % grasa` : ''}</small></div>
            <span class="mr-diff">${diff ? signed(diff, 1, '') : ''}</span>
            <button class="icon-btn sm ghost" data-action="delete-weight" data-id="${w.id}" aria-label="Eliminar">${I.trash}</button>
          </div>`;
      }).join('')}
      ${series.length > 7 ? `<button class="btn block ghost sm mt" data-action="body-all">${bodyShowAll ? 'Ver menos' : `Ver todas (${series.length})`}</button>` : ''}
    </section>` : '';

  return `${header}${hero}${goalHtml}${comp}${measures}${history}
    <p class="disclaimer">Los cálculos son estimaciones orientativas y no sustituyen la valoración de un médico o un nutricionista. El IMC no distingue músculo de grasa: si entrenas fuerza, fíjate más en la cintura y el % de grasa.</p>`;
}

// --- Formularios de Cuerpo ---

let profileForm = null;

function openProfile() {
  const p = S.state.profile || {};
  profileForm = { sex: p.sex || 'm' };
  const today = new Date();
  const maxBirth = S.ymd(new Date(today.getFullYear() - 14, today.getMonth(), today.getDate()));
  openOverlay(`
    <div class="sheet short" role="dialog" aria-modal="true" aria-label="Tu perfil">
      ${sheetHead('Tu perfil')}
      <div class="field">
        <span>Sexo</span>
        <div class="seg" id="sex-seg">
          <button class="${profileForm.sex === 'm' ? 'on' : ''}" data-action="profile-sex" data-s="m">Hombre</button>
          <button class="${profileForm.sex === 'f' ? 'on' : ''}" data-action="profile-sex" data-s="f">Mujer</button>
        </div>
      </div>
      <div class="form-grid mt">
        <label class="field"><span>Fecha de nacimiento</span>
          <input id="pf-birth" class="input" type="date" value="${p.birth || ''}" max="${maxBirth}" min="1920-01-01"></label>
        <label class="field"><span>Altura (cm)</span>
          <input id="pf-height" class="input" type="number" inputmode="decimal" min="120" max="230" step="0.5" value="${p.height || ''}" placeholder="178"></label>
      </div>
      <label class="field mt"><span>Peso objetivo (kg) <em>opcional</em></span>
        <input id="pf-goal" class="input" type="number" inputmode="decimal" min="30" max="250" step="0.1" value="${p.goalWeight || ''}" placeholder="Ej. 75"></label>
      <label class="field mt"><span>Nivel de actividad</span>
        <select id="pf-activity" class="input">
          ${S.ACTIVITY.map(([v, l, d]) => `<option value="${v}" ${v === (p.activity || 1.55) ? 'selected' : ''}>${l} · ${d}</option>`).join('')}
        </select></label>
      <button class="btn primary block mt" data-action="save-profile">Guardar perfil</button>
    </div>`, 'bottom');
}

function openWeight() {
  const last = S.state.weights[S.state.weights.length - 1];
  openOverlay(`
    <div class="sheet short" role="dialog" aria-modal="true" aria-label="Registrar peso">
      ${sheetHead('Registrar peso')}
      <div class="plate-input">
        <button class="icon-btn" data-action="w-step" data-d="-0.1" aria-label="Menos 0,1 kg">−</button>
        <div class="plate-kg">
          <input id="w-kg" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${last ? last.kg : ''}" placeholder="0,0">
          <span>kilogramos</span>
        </div>
        <button class="icon-btn" data-action="w-step" data-d="0.1" aria-label="Más 0,1 kg">+</button>
      </div>
      <div class="form-grid mt">
        <label class="field"><span>Fecha</span>
          <input id="w-date" class="input" type="date" value="${S.ymd()}" max="${S.ymd()}"></label>
        <label class="field"><span>% grasa <em>opcional</em></span>
          <input id="w-fat" class="input" type="number" inputmode="decimal" min="3" max="60" step="0.1" placeholder="Báscula"></label>
      </div>
      <p class="hint">Consejo: pésate siempre en las mismas condiciones. La tendencia filtra las subidas y bajadas diarias de agua.</p>
      <button class="btn primary block mt" data-action="save-weight">Guardar</button>
    </div>`, 'bottom');
}

function openMeasures() {
  const lm = S.latestMeasures();
  const sex = S.state.profile?.sex;
  openOverlay(`
    <div class="sheet short" role="dialog" aria-modal="true" aria-label="Registrar medidas">
      ${sheetHead('Medidas (cm)')}
      <label class="field"><span>Fecha</span>
        <input id="m-date" class="input" type="date" value="${S.ymd()}" max="${S.ymd()}"></label>
      <div class="form-grid mt">
        ${Object.entries(S.MEASURES).map(([k, l]) => `
          <label class="field"><span>${l}${(k === 'neck' || k === 'waist' || (k === 'hips' && sex === 'f')) ? ' <em>· % grasa</em>' : ''}</span>
            <input class="input" type="number" inputmode="decimal" min="10" max="250" step="0.1" data-measure="${k}" placeholder="${lm[k] ? num(lm[k].value, 1) : '—'}"></label>`).join('')}
      </div>
      <details class="howto">
        <summary>¿Cómo medir?</summary>
        <ul>
          <li><b>Cuello:</b> justo debajo de la nuez, cinta inclinada ligeramente hacia delante.</li>
          <li><b>Cintura:</b> a la altura del ombligo, relajado y al final de soltar el aire.</li>
          <li><b>Cadera:</b> en la parte más ancha de los glúteos.</li>
          <li><b>Pecho:</b> a la altura de los pezones, brazos relajados.</li>
          <li><b>Brazo y muslo:</b> en la zona más ancha, sin contraer.</li>
        </ul>
        <p>Mide siempre por la mañana y con la cinta ajustada sin apretar la piel.</p>
      </details>
      <button class="btn primary block mt" data-action="save-measures">Guardar medidas</button>
    </div>`, 'bottom');
}

// ---------- Pantalla: Ajustes ----------

function viewSettings() {
  const st = S.state.settings;
  const g = st.gym;
  const opt = (values, cur, label) =>
    values.map((v) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label(v)}</option>`).join('');
  // Horas cada media hora, en formato 24 h (igual en todos los móviles)
  const times = Array.from({ length: 48 }, (_, i) =>
    `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
  const timeSelect = (k, i, label) => `
    <select class="input time" data-field="gym-h" data-k="${k}" data-i="${i}" aria-label="${label}">
      ${times.map((t) => `<option ${t === g[k][i] ? 'selected' : ''}>${t}</option>`).join('')}
    </select>`;
  const hours = (k, title) => `
    <div class="hours">
      <span>${title}</span>
      ${timeSelect(k, 0, `${title}: abre`)}
      <span class="muted">a</span>
      ${timeSelect(k, 1, `${title}: cierra`)}
    </div>`;

  return `
    ${topBar('Ajustes', { back: '#/inicio' })}

    <h2 class="section-title">Casa o gimnasio</h2>
    <section class="card stack">
      <label class="switch-row">
        <span><strong>Detectar automáticamente</strong><small>Al empezar un entreno, compara tu ubicación con la del gimnasio</small></span>
        <input type="checkbox" class="switch" data-field="auto-place" ${st.autoPlace ? 'checked' : ''}>
      </label>
      <p class="hint" style="margin:0">${st.gymLoc
        ? `📍 Ubicación del gimnasio guardada el ${date(st.gymLoc.saved || Date.now(), { day: 'numeric', month: 'long' })}.`
        : '📍 Aún no hay ubicación guardada: la próxima vez que entrenes te preguntaré si estás en el gimnasio.'}</p>
      <button class="btn block" data-action="save-gym-loc">Estoy en el gimnasio: guardar ubicación</button>
      ${st.gymLoc ? '<button class="btn block text-danger" data-action="forget-gym-loc">Olvidar ubicación</button>' : ''}
      <p class="hint" style="margin:0">La ubicación solo se usa en tu móvil para esta comprobación: no se envía a ningún sitio.</p>
    </section>

    <h2 class="section-title">Tu gimnasio</h2>
    <section class="card stack">
      <label class="field">
        <span>Nombre</span>
        <input class="input" value="${esc(g.name)}" data-field="gym-name" maxlength="40" placeholder="Nombre del gimnasio">
      </label>
      ${hours('weekday', 'Lunes a viernes')}
      ${hours('weekend', 'Fines de semana')}
      <p class="hint">En festivos el horario puede cambiar: compruébalo en la app o en el propio gimnasio.</p>
    </section>

    <h2 class="section-title">Entrenamiento</h2>
    <section class="card stack">
      <label class="field">
        <span>Objetivo semanal</span>
        <select class="input" data-field="goal">
          ${opt([1, 2, 3, 4, 5, 6, 7], st.weeklyGoal, (v) => `${v} ${v === 1 ? 'entreno' : 'entrenos'} por semana`)}
        </select>
      </label>
      <label class="field">
        <span>Descanso entre series</span>
        <select class="input" data-field="rest">
          ${opt([0, 30, 45, 60, 90, 120, 150, 180, 240, 300], st.restSeconds, (s) => (s ? clock(s) + ' min' : 'Desactivado'))}
        </select>
      </label>
      <label class="field">
        <span>Subida de peso sugerida</span>
        <select class="input" data-field="increment">
          ${opt([1, 1.25, 2, 2.5, 5], st.increment, (v) => `+${num(v, 2)} kg`)}
        </select>
      </label>
    </section>

    <h2 class="section-title">Calculadora de discos</h2>
    <section class="card stack">
      <label class="field">
        <span>Barra por defecto</span>
        <select class="input" data-field="bar">
          ${opt([20, 15, 10], st.bar, (v) => `${v} kg`)}
        </select>
      </label>
      <div class="field">
        <span>Discos disponibles</span>
        <div class="chips">
          ${S.ALL_PLATES.map((p) => `<button class="chip ${st.plates.includes(p) ? 'on' : ''}" data-action="plate-toggle" data-p="${p}">${num(p, 2)} kg</button>`).join('')}
        </div>
      </div>
    </section>

    <h2 class="section-title">Tus datos</h2>
    <section class="card stack">
      <p class="hint">Todo se guarda únicamente en este dispositivo. Exporta una copia de vez en cuando para no perder tu historial.</p>
      <button class="btn block" data-action="export">${I.download}Exportar copia de seguridad</button>
      <label class="btn block">${I.upload}Importar copia de seguridad
        <input type="file" accept="application/json,.json" data-field="import" hidden>
      </label>
      <button class="btn block text-danger" data-action="reset">Borrar todos los datos</button>
    </section>
    <p class="foot">GymLog ${APP_VERSION}</p>
  `;
}

// ---------- Después de pintar ----------

function drawBodyChart() {
  const canvas = document.getElementById('ch-body');
  if (!canvas) return;
  const b = S.bodyStats();
  const from = bodyRange ? Date.now() - bodyRange * 864e5 : 0;
  const pts = b.series.filter((w) => w.t >= from);
  bodyChart(canvas, pts.map((w) => ({ t: w.t, y: w.kg })), pts.map((w) => ({ t: w.t, y: w.trend })), { goal: b.goal });
}

function afterRender(r, changed = false) {
  if (r.name === 'inicio') animateRing(changed);
  if (r.name === 'cuerpo') drawBodyChart();
  if (r.name === 'resumen' && celebrate === r.id) {
    const w = S.state.workouts.find((x) => x.id === r.id);
    celebrate = null;
    confetti(w?.prs?.length ? 1.4 : 0.8);
    navigator.vibrate?.([30, 50, 30]);
  }
  if (r.name !== 'progreso' || !S.state.workouts.length) return;
  const weeks = S.weeklyCounts(8).map((w) => ({
    label: date(w.start, { day: 'numeric', month: 'numeric' }),
    value: w.count,
  }));
  barChart(document.getElementById('ch-weeks'), weeks);
  const canvas = document.getElementById('ch-ex');
  if (!canvas) return;
  const type = S.exerciseType(progressEx);
  const hist = S.exerciseHistory(progressEx);
  lineChart(canvas, hist.map((h) => ({ t: h.t, y: h[progressMetric] })), {
    unit: METRICS[type][progressMetric].unit,
  });
}

// Redibujar gráficas al girar el móvil
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => ['progreso', 'cuerpo'].includes(route().name) && afterRender(route()), 150);
});

// ---------- Ventanas emergentes ----------

let pending = null; // resolve del diálogo abierto
let pickerCtx = null;

function openOverlay(html, mode) {
  overlay.className = mode;
  overlay.innerHTML = html;
  overlay.hidden = false;
  document.body.classList.add('locked');
}

function closeOverlay() {
  document.activeElement?.blur(); // cierra el teclado antes de quitar la ventana
  overlay.hidden = true;
  overlay.innerHTML = '';
  overlay.className = '';
  document.body.classList.remove('locked');
  pickerCtx = null;
  if (pending) { const p = pending; pending = null; p(false); }
}

const sheetHead = (title) => `
  <div class="grabber"></div>
  <div class="sheet-head">
    <h2>${title}</h2>
    <button class="icon-btn" data-action="close" aria-label="Cerrar">${I.x}</button>
  </div>`;

/** Diálogo de confirmación. Devuelve una promesa con true/false */
function ask(message, { ok = 'Aceptar', cancel = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    openOverlay(`
      <div class="dialog" role="alertdialog" aria-modal="true">
        <p>${esc(message)}</p>
        <div class="dialog-actions">
          <button class="btn" data-answer="0">${cancel}</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-answer="1">${ok}</button>
        </div>
      </div>`, 'center');
    pending = resolve;
  });
}

// --- Selector de ejercicios ---

function openPicker(ctx) {
  openOverlay(`
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Añadir ejercicio">
      ${sheetHead('Añadir ejercicio')}
      <input id="picker-q" class="input" type="search" placeholder="Buscar o crear ejercicio…" autocomplete="off" enterkeyhint="done">
      <div id="picker-list" class="picker-list"></div>
    </div>`, 'bottom');
  pickerCtx = ctx;
  renderPickerList('');
}

function renderPickerList(q) {
  const names = S.exerciseNames();
  const nq = S.norm(q);
  const list = nq ? names.filter((n) => S.norm(n).includes(nq)) : names;
  const exact = names.some((n) => S.norm(n) === nq);
  const term = esc(q.trim());
  document.getElementById('picker-list').innerHTML =
    (term && !exact
      ? `<button class="list-item create" data-action="pick" data-name="${term}">${I.plus}Crear «${term}»</button>
         <button class="list-item create" data-action="pick" data-name="${term}" data-type="cardio">${I.plus}Crear «${term}» como cardio</button>`
      : '') +
    list.map((n) => `
      <button class="list-item" data-action="pick" data-name="${esc(n)}">
        ${esc(n)}${S.exerciseType(n) === 'cardio' ? '<span class="tag">Cardio</span>' : ''}
      </button>`).join('') +
    (!list.length && !term ? '<p class="hint">No hay ejercicios</p>' : '');
}

// --- Registrar clase colectiva ---

let classForm = null;

function openClassSheet() {
  classForm = { name: S.CLASSES[0], min: 45 };
  openOverlay(`
    <div class="sheet short" role="dialog" aria-modal="true" aria-label="Registrar clase">
      ${sheetHead('Registrar clase')}
      <p class="hint" style="margin-top:0">Apunta una clase colectiva que acabas de terminar para que cuente en tu semana.</p>
      <div class="field mt">
        <span>Clase</span>
        <div class="chips" id="class-types">
          ${S.CLASSES.map((c, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-action="class-type" data-name="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </div>
      <label class="field mt">
        <span>¿Otra? Escribe el nombre</span>
        <input id="class-other" class="input" placeholder="Nombre de la clase" maxlength="40" autocomplete="off">
      </label>
      <div class="field mt">
        <span>Duración</span>
        <div class="seg" id="class-dur">
          ${[30, 45, 50, 60, 75].map((m) => `<button class="${m === 45 ? 'on' : ''}" data-action="class-dur" data-min="${m}">${m}′</button>`).join('')}
        </div>
      </div>
      <button class="btn primary block mt" data-action="save-class">Guardar clase</button>
    </div>`, 'bottom');
}

// --- Calculadora de discos ---

let plateBar = 20;

const PLATE_STYLE = {
  25: ['#e5484d', 116], 20: ['#3e7bfa', 116], 15: ['#f5c518', 100], 10: ['#30a46c', 86],
  5: ['#f3f4f6', 64], 2.5: ['#e5484d', 50], 1.25: ['#9aa0a6', 42],
};

function openPlates(kg) {
  plateBar = S.state.settings.bar;
  openOverlay(`
    <div class="sheet short" role="dialog" aria-modal="true" aria-label="Calculadora de discos">
      ${sheetHead('Calculadora de discos')}
      <div class="plate-input">
        <button class="icon-btn" data-action="plate-step" data-d="-2.5" aria-label="Menos 2,5 kg">−</button>
        <div class="plate-kg">
          <input id="plate-kg" type="number" inputmode="decimal" step="any" min="0" value="${kg || ''}" placeholder="0">
          <span>kg en total</span>
        </div>
        <button class="icon-btn" data-action="plate-step" data-d="2.5" aria-label="Más 2,5 kg">+</button>
      </div>
      <div class="seg mt" id="plate-bars">
        ${[20, 15, 10].map((b) => `<button class="${b === plateBar ? 'on' : ''}" data-action="plate-bar" data-bar="${b}">Barra ${b} kg</button>`).join('')}
      </div>
      <div id="plate-result" class="mt"></div>
    </div>`, 'bottom');
  renderPlates();
}

function renderPlates() {
  const kg = Number(document.getElementById('plate-kg').value);
  const out = document.getElementById('plate-result');
  if (!kg) {
    out.innerHTML = '<p class="hint">Escribe el peso total que quieres levantar (barra incluida).</p>';
    return;
  }
  if (kg <= plateBar) {
    out.innerHTML = `<p class="hint">${kg === plateBar ? 'Solo la barra, sin discos.' : `Es menos que la barra (${plateBar} kg).`}</p>`;
    return;
  }
  const r = S.plateCalc(kg, plateBar);
  const groups = [];
  r.plates.forEach((p) => {
    const g = groups.find((x) => x.p === p);
    g ? g.n++ : groups.push({ p, n: 1 });
  });
  out.innerHTML = `
    <div class="barbell" aria-hidden="true">
      <div class="bb-bar"></div>
      <div class="bb-collar"></div>
      ${r.plates.map((p) => {
        const [color, h] = PLATE_STYLE[p] || ['#9aa0a6', 40];
        return `<i class="bb-plate" style="background:${color};height:${h}px"></i>`;
      }).join('')}
      <div class="bb-sleeve"></div>
    </div>
    <p class="plate-title">En <strong>cada lado</strong>: ${num(r.side, 2)} kg</p>
    <div class="plate-list">
      ${groups.map((g) => `<span><i style="background:${PLATE_STYLE[g.p]?.[0] || '#9aa0a6'}"></i>${g.n} × ${num(g.p, 2)} kg</span>`).join('')}
    </div>
    ${r.rest > 0 ? `<p class="hint text-warn">Con tus discos no sale exacto: faltan ${num(r.rest * 2, 2)} kg en total. Prueba con ${num(kg - r.rest * 2, 2)} kg.</p>` : ''}`;
}

// ---------- Temporizador de descanso ----------

let audioCtx;
function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* sin audio */ }
}

function beep() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    o.connect(g).connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
    o.start(t + d);
    o.stop(t + d + 0.2);
  });
}

function startRest(seconds = S.state.settings.restSeconds) {
  const a = S.state.active;
  if (!a || !seconds) return;
  a.restEnd = Date.now() + seconds * 1000;
  a.restTotal = seconds;
  S.save();
}

/** Se ejecuta cada medio segundo: actualiza cronómetros */
function tick() {
  const a = S.state.active;
  if (a) {
    const t = clock((Date.now() - a.start) / 1000);
    document.querySelectorAll('[data-elapsed]').forEach((el) => (el.textContent = t));
  }
  if (a?.restEnd) {
    const left = (a.restEnd - Date.now()) / 1000;
    if (left <= 0) {
      a.restEnd = null;
      S.save();
      restEl.hidden = true;
      beep();
      navigator.vibrate?.([200, 100, 200]);
      toast('¡Descanso terminado! A por la siguiente 💪');
      return;
    }
    restEl.hidden = false;
    document.getElementById('rest-time').textContent = clock(left);
    restEl.querySelector('.rest-bar i').style.width = `${(left / a.restTotal) * 100}%`;
  } else {
    restEl.hidden = true;
  }
}
setInterval(tick, 500);

// ---------- Acciones (botones con data-action) ----------

async function confirmStart() {
  if (!S.state.active) return true;
  return ask('Ya tienes un entrenamiento en curso. ¿Descartarlo y empezar otro?', {
    ok: 'Descartar y empezar', danger: true,
  });
}

/** Avisa si el gimnasio está a punto de cerrar */
function warnClosing() {
  const st = S.gymStatus();
  if (st.open && st.left <= 60) {
    setTimeout(() => toast(`⏰ Ojo: el gimnasio cierra a las ${st.closes} (en ${st.left} min)`, 4500), 300);
  }
}

function begin(template) {
  unlockAudio();
  S.startWorkout(template);
  go('#/activo');
  warnClosing();
  detectPlace();
}

const actions = {
  nav: async (el) => {
    const to = el.dataset.to;
    if (route().name === 'rutina' && draft?.dirty &&
      !(await ask('Tienes cambios sin guardar. ¿Salir igualmente?', { ok: 'Salir', danger: true }))) return;
    if (route().name === 'rutina') draft = null;
    go(to);
  },

  close: () => closeOverlay(),

  // --- Empezar ---
  'start-routine': async (el) => {
    const r = S.state.routines.find((x) => x.id === el.dataset.id);
    if (!r || !(await confirmStart())) return;
    begin({ name: r.name, routineId: r.id, place: r.place, exercises: r.exercises });
  },
  'start-empty': async () => {
    if (!(await confirmStart())) return;
    begin(null);
  },
  'repeat-workout': async (el) => {
    const w = S.state.workouts.find((x) => x.id === el.dataset.id);
    if (!w || !(await confirmStart())) return;
    begin({
      name: w.name,
      routineId: w.routineId,
      exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: '' })),
    });
  },

  // --- Durante el entrenamiento ---
  'toggle-set': (el) => {
    const ex = S.state.active.exercises[+el.dataset.ex];
    const s = ex.sets[+el.dataset.set];
    if (s.done) {
      s.done = false;
    } else {
      const cardio = isCardio(ex);
      const [fa, fb] = cardio ? ['min', 'km'] : ['kg', 'reps'];
      const [inA, inB] = el.closest('.set-row').querySelectorAll('input');
      if ((s[fa] ?? '') === '' && inA.placeholder !== '') s[fa] = inA.placeholder;
      if ((s[fb] ?? '') === '' && inB.placeholder !== '') s[fb] = inB.placeholder;
      if (cardio) {
        if (!(Number(s.min) > 0)) { toast('Indica los minutos'); inA.focus(); return; }
        if ((s.km ?? '') === '') s.km = '0';
      } else {
        if (!(Number(s.reps) > 0)) { toast('Indica las repeticiones'); inB.focus(); return; }
        if (s.kg === '') s.kg = '0'; // peso corporal
      }
      s.done = true;
      popKey = `${el.dataset.ex}-${el.dataset.set}`;
      navigator.vibrate?.(15);
      unlockAudio();
      if (!cardio) startRest();
    }
    S.save();
    render();
  },
  'apply-suggest': (el) => {
    const ex = S.state.active.exercises[+el.dataset.ex];
    ex.sets.forEach((s) => { if (!s.done && s.kg === '') s.kg = el.dataset.kg; });
    S.save();
    render();
    toast(`Peso aplicado: ${num(+el.dataset.kg, 2)} kg`);
  },
  'add-set': (el) => { S.addSet(+el.dataset.ex); render(); },
  'remove-set': (el) => { S.removeLastSet(+el.dataset.ex); render(); },
  'remove-exercise': async (el) => {
    const i = +el.dataset.ex;
    const ex = S.state.active.exercises[i];
    if (!(await ask(`¿Quitar «${ex.name}» del entrenamiento?`, { ok: 'Quitar', danger: true }))) return;
    S.state.active.exercises.splice(i, 1);
    S.save();
    render();
  },
  'open-picker': (el) => openPicker(el.dataset.ctx),
  pick: (el) => {
    const name = el.dataset.name;
    const ctx = pickerCtx;
    if (el.dataset.type === 'cardio') S.setExerciseType(name, 'cardio');
    closeOverlay();
    if (ctx === 'workout') {
      S.addExerciseToActive(name);
      render();
      requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    } else if (ctx === 'routine' && draft) {
      const cardio = S.exerciseType(name) === 'cardio';
      const prev = S.lastSets(name);
      draft.exercises.push({ name, sets: prev?.length || (cardio ? 1 : 3), reps: cardio ? 20 : 10 });
      draft.dirty = true;
      render();
    }
  },
  'rest-add': (el) => {
    const a = S.state.active;
    if (!a?.restEnd) return;
    const delta = +el.dataset.sec * 1000;
    a.restEnd = Math.max(Date.now() + 1000, a.restEnd + delta);
    a.restTotal = Math.max(a.restTotal + delta / 1000, (a.restEnd - Date.now()) / 1000);
    S.save();
    tick();
  },
  'rest-skip': () => {
    if (!S.state.active) return;
    S.state.active.restEnd = null;
    S.save();
    tick();
  },
  finish: async () => {
    const a = S.state.active;
    const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    if (!done) {
      if (await ask('No has completado ninguna serie. ¿Descartar el entrenamiento?', { ok: 'Descartar', danger: true })) {
        S.discardWorkout();
        go('#/inicio');
      }
      return;
    }
    const msg = done < total
      ? `Tienes ${total - done} ${total - done === 1 ? 'serie' : 'series'} sin marcar. Se descartarán al terminar.`
      : '¿Terminar y guardar el entrenamiento?';
    if (!(await ask(msg, { ok: 'Terminar' }))) return;
    const w = S.finishWorkout();
    celebrate = w.id;
    go('#/resumen/' + w.id);
  },
  'cancel-workout': async () => {
    if (!(await ask('¿Descartar este entrenamiento? Se perderán las series registradas.', { ok: 'Descartar', danger: true }))) return;
    S.discardWorkout();
    go('#/inicio');
  },

  // --- Clase colectiva ---
  'open-class': () => openClassSheet(),
  'class-type': (el) => {
    classForm.name = el.dataset.name;
    overlay.querySelectorAll('#class-types .chip').forEach((c) => c.classList.toggle('on', c === el));
    document.getElementById('class-other').value = '';
  },
  'class-dur': (el) => {
    classForm.min = +el.dataset.min;
    overlay.querySelectorAll('#class-dur button').forEach((b) => b.classList.toggle('on', b === el));
  },
  'save-class': () => {
    const other = document.getElementById('class-other').value.trim();
    const w = S.logClass(other || classForm.name, classForm.min);
    closeOverlay();
    celebrate = w.id;
    go('#/resumen/' + w.id);
  },

  // --- Calculadora de discos ---
  'open-plates': (el) => {
    let kg = '';
    const ex = el.dataset.ex != null ? S.state.active?.exercises[+el.dataset.ex] : null;
    if (ex) {
      const typed = ex.sets.map((s) => Number(s.kg)).filter((v) => v > 0);
      const prev = S.lastSets(ex.name)?.map((s) => s.kg).filter((v) => v > 0) || [];
      const vals = typed.length ? typed : prev;
      kg = S.suggestKg(ex.name, ex.sets) && !typed.length ? S.suggestKg(ex.name, ex.sets) : vals.length ? Math.max(...vals) : '';
    }
    openPlates(kg);
  },
  'plate-step': (el) => {
    const input = document.getElementById('plate-kg');
    input.value = Math.max(0, (Number(input.value) || 0) + Number(el.dataset.d));
    renderPlates();
  },
  'plate-bar': (el) => {
    plateBar = +el.dataset.bar;
    overlay.querySelectorAll('#plate-bars button').forEach((b) => b.classList.toggle('on', b === el));
    renderPlates();
  },

  // --- Rutinas ---
  'new-routine': () => {
    const color = S.PALETTE[S.state.routines.length % S.PALETTE.length];
    draft = { id: S.uid(), name: '', color, exercises: [], isNew: true, dirty: false };
    go('#/rutina/' + draft.id);
  },
  'r-color': (el) => {
    draft.color = el.dataset.c;
    draft.dirty = true;
    app.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === el));
  },
  'r-move': (el) => {
    const i = +el.dataset.i;
    const j = i + +el.dataset.dir;
    [draft.exercises[i], draft.exercises[j]] = [draft.exercises[j], draft.exercises[i]];
    draft.dirty = true;
    render();
  },
  'r-remove': (el) => {
    draft.exercises.splice(+el.dataset.i, 1);
    draft.dirty = true;
    render();
  },
  'save-routine': () => {
    if (!draft.name.trim()) {
      toast('Ponle un nombre a la rutina');
      app.querySelector('[data-field="r-name"]').focus();
      return;
    }
    if (!draft.exercises.length) return toast('Añade al menos un ejercicio');
    S.upsertRoutine(draft);
    draft = null;
    toast('Rutina guardada');
    go('#/rutinas');
  },
  'delete-routine': async () => {
    if (!(await ask(`¿Eliminar la rutina «${draft.name}»? Tu historial no se borra.`, { ok: 'Eliminar', danger: true }))) return;
    S.deleteRoutine(draft.id);
    draft = null;
    toast('Rutina eliminada');
    go('#/rutinas');
  },

  // --- Historial ---
  'delete-workout': async (el) => {
    if (!(await ask('¿Eliminar este registro del historial? No se puede deshacer.', { ok: 'Eliminar', danger: true }))) return;
    S.deleteWorkout(el.dataset.id);
    toast('Eliminado del historial');
    go('#/historial');
  },

  // --- Casa o gimnasio ---
  'toggle-place': () => {
    const a = S.state.active;
    a.place = a.place === 'gym' ? 'home' : 'gym';
    a.placeSource = 'manual';
    S.save();
    render();
  },
  'set-place': (el) => {
    const w = S.state.workouts.find((x) => x.id === el.dataset.id);
    S.setWorkoutPlace(w.id, S.workoutPlace(w) === 'gym' ? 'home' : 'gym');
    render();
  },
  'r-place': (el) => {
    draft.place = el.dataset.p || null;
    draft.dirty = true;
    app.querySelectorAll('#r-place button').forEach((b) => b.classList.toggle('on', b === el));
  },
  'save-gym-loc': async () => {
    toast('📍 Obteniendo ubicación…');
    const coords = await getPosition(15000);
    if (!coords) return toast('No se pudo obtener la ubicación. Revisa los permisos de Safari.', 4000);
    S.saveGymLocation(coords);
    toast('Ubicación del gimnasio guardada');
    render();
  },
  'forget-gym-loc': async () => {
    if (!(await ask('¿Olvidar la ubicación del gimnasio?', { ok: 'Olvidar', danger: true }))) return;
    S.saveGymLocation(null);
    render();
  },
  'cal-nav': (el) => {
    const now = new Date();
    const cm = calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
    calMonth = new Date(cm.getFullYear(), cm.getMonth() + Number(el.dataset.d), 1);
    calSel = null;
    render();
  },
  'cal-day': (el) => {
    calSel = calSel === el.dataset.k ? null : el.dataset.k;
    render();
  },

  // --- Cuerpo ---
  'open-profile': () => openProfile(),
  'profile-sex': (el) => {
    profileForm.sex = el.dataset.s;
    overlay.querySelectorAll('#sex-seg button').forEach((b) => b.classList.toggle('on', b === el));
  },
  'save-profile': () => {
    const birth = document.getElementById('pf-birth').value;
    const height = Number(document.getElementById('pf-height').value);
    const goal = Number(document.getElementById('pf-goal').value);
    const activity = Number(document.getElementById('pf-activity').value);
    const a = S.age(birth);
    if (!birth || a == null || a < 14 || a > 100) return toast('Revisa la fecha de nacimiento');
    if (!(height >= 120 && height <= 230)) return toast('La altura debe estar entre 120 y 230 cm');
    if (goal && !(goal >= 30 && goal <= 250)) return toast('Revisa el peso objetivo');
    S.saveProfile({ sex: profileForm.sex, birth, height, goalWeight: goal || null, activity });
    closeOverlay();
    toast('Perfil guardado');
    render();
  },
  'open-weight': () => openWeight(),
  'w-step': (el) => {
    const input = document.getElementById('w-kg');
    const v = (Number(input.value) || 0) + Number(el.dataset.d);
    input.value = Math.max(0, Math.round(v * 10) / 10);
  },
  'save-weight': () => {
    const kg = Number(document.getElementById('w-kg').value);
    const day = document.getElementById('w-date').value || S.ymd();
    const fat = Number(document.getElementById('w-fat').value) || null;
    if (!(kg >= 30 && kg <= 300)) return toast('Introduce un peso entre 30 y 300 kg');
    if (fat && !(fat >= 3 && fat <= 60)) return toast('Revisa el % de grasa');
    if (day > S.ymd()) return toast('La fecha no puede ser futura');
    const replaced = S.addWeight(day, Math.round(kg * 10) / 10, fat);
    closeOverlay();
    toast(replaced ? 'Peso de ese día actualizado' : 'Peso registrado');
    render();
  },
  'delete-weight': async (el) => {
    if (!(await ask('¿Eliminar esta pesada?', { ok: 'Eliminar', danger: true }))) return;
    S.deleteWeight(el.dataset.id);
    render();
  },
  'open-measures': () => openMeasures(),
  'save-measures': () => {
    const day = document.getElementById('m-date').value || S.ymd();
    const values = {};
    overlay.querySelectorAll('[data-measure]').forEach((i) => {
      const v = Number(i.value);
      if (v) values[i.dataset.measure] = Math.round(v * 10) / 10;
    });
    if (!Object.keys(values).length) return toast('Rellena al menos una medida');
    if (Object.values(values).some((v) => v < 10 || v > 250)) return toast('Alguna medida no parece correcta (cm)');
    if (day > S.ymd()) return toast('La fecha no puede ser futura');
    S.addMeasures(day, values);
    closeOverlay();
    toast('Medidas guardadas');
    render();
  },
  'delete-measures': async (el) => {
    if (!(await ask('¿Eliminar este registro de medidas?', { ok: 'Eliminar', danger: true }))) return;
    S.deleteMeasures(el.dataset.id);
    render();
  },
  'body-range': (el) => { bodyRange = Number(el.dataset.d); render(); },
  'body-all': () => { bodyShowAll = !bodyShowAll; render(); },

  // --- Progreso ---
  metric: (el) => { progressMetric = el.dataset.m; render(); },
  'muscle-range': (el) => { muscleRange = el.dataset.r; render(); },
  muscle: (el) => {
    const n = Number(el.dataset.n);
    const sets = n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
    toast(n ? `${MUSCLES[el.dataset.m]}: ${sets} ${n === 1 ? 'serie' : 'series'}` : `${MUSCLES[el.dataset.m]}: sin trabajar`);
  },

  // --- Ajustes ---
  'plate-toggle': (el) => {
    const p = Number(el.dataset.p);
    const list = S.state.settings.plates;
    S.state.settings.plates = list.includes(p) ? list.filter((x) => x !== p) : [...list, p].sort((a, b) => b - a);
    S.save();
    render();
  },
  export: async () => {
    const name = `gymlog-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(S.state, null, 2)], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Copia de GymLog' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia descargada');
  },
  reset: async () => {
    if (!(await ask('Se borrarán tus rutinas, tu historial y el entrenamiento en curso. No se puede deshacer.', { ok: 'Borrar todo', danger: true }))) return;
    S.resetState();
    toast('Datos borrados');
    go('#/inicio');
  },
};

document.addEventListener('click', (e) => {
  // Respuesta de un diálogo
  const answer = e.target.closest('[data-answer]');
  if (answer && pending) {
    const p = pending;
    pending = null;
    closeOverlay();
    p(answer.dataset.answer === '1');
    return;
  }
  // Toque fuera de la ventana emergente
  if (e.target === overlay) return closeOverlay();

  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  e.preventDefault();
  actions[el.dataset.action]?.(el, e);
});

// ---------- Campos de texto ----------

document.addEventListener('input', (e) => {
  const t = e.target;
  const f = t.dataset.field;

  if (t.id === 'picker-q') return renderPickerList(t.value);
  if (t.id === 'plate-kg') return renderPlates();
  if (t.id === 'class-other') {
    overlay.querySelectorAll('#class-types .chip').forEach((c) => c.classList.toggle('on', !t.value.trim() && c.dataset.name === classForm.name));
    return;
  }

  if (['kg', 'reps', 'min', 'km'].includes(f)) {
    const s = S.state.active?.exercises[+t.dataset.ex]?.sets[+t.dataset.set];
    if (!s) return;
    s[f] = t.value;
    S.save();
  } else if (f === 'r-name' && draft) {
    draft.name = t.value;
    draft.dirty = true;
  } else if ((f === 'r-sets' || f === 'r-reps') && draft) {
    draft.exercises[+t.dataset.i][f === 'r-sets' ? 'sets' : 'reps'] = t.value;
    draft.dirty = true;
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  const f = t.dataset.field;
  const st = S.state.settings;
  if (f === 'auto-place') {
    st.autoPlace = t.checked;
    S.save();
    toast(t.checked ? 'Detección automática activada' : 'Detección automática desactivada');
  } else if (f === 'goal') {
    st.weeklyGoal = +t.value;
    S.save();
    toast('Objetivo semanal actualizado');
  } else if (f === 'rest') {
    st.restSeconds = +t.value;
    S.save();
    toast('Descanso actualizado');
  } else if (f === 'increment') {
    st.increment = +t.value;
    S.save();
    toast('Subida sugerida actualizada');
  } else if (f === 'bar') {
    st.bar = +t.value;
    S.save();
  } else if (f === 'gym-name') {
    st.gym.name = t.value.trim();
    S.save();
    toast('Gimnasio actualizado');
  } else if (f === 'gym-h') {
    if (!t.value) return;
    st.gym[t.dataset.k][+t.dataset.i] = t.value;
    S.save();
    toast('Horario actualizado');
  } else if (f === 'progress-ex') {
    progressEx = t.value;
    render();
  } else if (f === 'import' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!(await ask('Se sustituirán tus datos actuales por los de la copia. ¿Continuar?', { ok: 'Importar' }))) return;
      S.replaceState(data);
      toast('Copia importada');
      go('#/inicio');
    } catch (err) {
      toast(err.message.includes('GymLog') ? err.message : 'El archivo no es válido');
    } finally {
      t.value = '';
    }
  }
});

// Pulsar "Intro" en el teclado del móvil pasa al siguiente campo
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.matches('#app input.num')) return;
  e.preventDefault();
  const inputs = [...app.querySelectorAll('input.num')];
  const next = inputs[inputs.indexOf(e.target) + 1];
  next ? next.focus() : e.target.blur();
});

// Actualiza el estado del gimnasio (abierto/cerrado) cada minuto en Inicio
setInterval(() => {
  if (route().name === 'inicio' && overlay.hidden && !app.contains(document.activeElement)) render();
}, 60000);

// ---------- Arranque ----------

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
