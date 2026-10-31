// =============================================================
//  store.js — Datos de la app y lógica de negocio
//  Todo se guarda en localStorage (en el propio móvil).
// =============================================================

const KEY = 'gymlog:v1';

/** Genera un id único corto */
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Normaliza un nombre para comparar: sin tildes, minúsculas, sin espacios extra */
export const norm = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Catálogo inicial de ejercicios de fuerza */
const STRENGTH = [
  'Press banca', 'Press inclinado con barra', 'Press inclinado con mancuernas',
  'Aperturas con mancuernas', 'Cruces en polea', 'Contractora (pec deck)', 'Fondos', 'Flexiones',
  'Press militar', 'Press de hombro con mancuernas', 'Press de hombro en máquina',
  'Elevaciones laterales', 'Pájaros', 'Face pull',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna',
  'Remo en polea baja', 'Remo en máquina', 'Pullover en polea',
  'Curl con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl en banco Scott',
  'Extensión de tríceps en polea', 'Press francés', 'Extensión de tríceps sobre la cabeza',
  'Sentadilla', 'Sentadilla en multipower', 'Sentadilla búlgara', 'Sentadilla hack',
  'Prensa', 'Zancadas', 'Peso muerto', 'Peso muerto rumano', 'Hip thrust',
  'Extensión de cuádriceps', 'Curl femoral', 'Abductores', 'Aductores', 'Elevación de gemelos',
  'Plancha', 'Crunch en polea', 'Elevaciones de piernas colgado',
  // Sin material (en casa)
  'Sentadilla sin peso', 'Puente de glúteo', 'Fondos en silla', 'Flexiones diamante',
  'Burpees', 'Mountain climbers', 'Superman', 'Abdominales (crunch)',
];

/** Ejercicios de cardio (se registran con minutos y km) */
const CARDIO = [
  'Cinta de correr', 'Bicicleta estática', 'Elíptica', 'Remo ergómetro', 'Escaladora',
  'Saltar a la comba', 'Correr al aire libre',
];

/** Tipos de clase colectiva para el registro rápido */
export const CLASSES = [
  'Pilates', 'Core Fitness', 'Ciclo indoor', 'HIIT', 'Tonificación',
  'Yoga', 'Zumba', 'Estiramientos',
];

/** Discos estándar de un gimnasio (kg) */
export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Colores para las rutinas */
export const PALETTE = ['#ff8a3d', '#4da3ff', '#3ddc84', '#d4ff3a', '#c084fc', '#ff5f7e', '#ffd43b', '#2dd4bf'];
const CLASS_COLOR = '#c084fc';
const FREE_COLOR = 'var(--accent)';

export const routineColor = (r) =>
  r?.color || PALETTE[Math.max(0, state.routines.indexOf(r)) % PALETTE.length];

/** Color de un entrenamiento: el de su rutina, morado si es clase, lima si es libre */
export function workoutColor(w) {
  if (!w) return FREE_COLOR;
  if (w.kind === 'class') return CLASS_COLOR;
  const r = state.routines.find((x) => x.id === w.routineId);
  return r ? routineColor(r) : FREE_COLOR;
}

const makeRoutine = (name, list, color, place = null) => ({
  id: uid(),
  name,
  color,
  ...(place ? { place } : {}),
  exercises: list.map(([n, sets, reps]) => ({ name: n, sets, reps })),
});

/** Rutina para entrenar en casa sin material */
const homeRoutine = () => makeRoutine('En casa (sin material)', [
  ['Flexiones', 4, 12], ['Sentadilla sin peso', 4, 20], ['Fondos en silla', 3, 12],
  ['Puente de glúteo', 3, 15], ['Superman', 3, 12], ['Abdominales (crunch)', 3, 20],
], PALETTE[7], 'home');

function seedRoutines() {
  const r = makeRoutine;
  return [
    r('Empuje (Push)', [
      ['Press banca', 4, 8], ['Press inclinado con mancuernas', 3, 10],
      ['Press militar', 3, 8], ['Elevaciones laterales', 3, 15],
      ['Extensión de tríceps en polea', 3, 12],
    ], PALETTE[0]),
    r('Tirón (Pull)', [
      ['Dominadas', 4, 8], ['Remo con barra', 4, 8], ['Jalón al pecho', 3, 10],
      ['Face pull', 3, 15], ['Curl con barra', 3, 10],
    ], PALETTE[1]),
    r('Pierna (Legs)', [
      ['Sentadilla', 4, 6], ['Peso muerto rumano', 3, 8], ['Prensa', 3, 10],
      ['Curl femoral', 3, 12], ['Elevación de gemelos', 4, 15],
    ], PALETTE[2]),
    homeRoutine(),
  ];
}

const defaultSettings = () => ({
  weeklyGoal: 4, // entrenamientos por semana
  accent: '#d4ff3a', // color principal de la app
  restSeconds: 90,
  increment: 2.5, // kg que sugiere subir
  bar: 20, // peso de la barra
  plates: [...ALL_PLATES], // discos disponibles
  autoPlace: true, // detectar casa/gimnasio con la ubicación
  gymLoc: null, // { lat, lon } del gimnasio (se aprende la primera vez)
  gym: {
    name: 'VivaGym Los Remedios',
    weekday: ['06:00', '23:00'],
    weekend: ['08:00', '21:00'],
  },
});

const defaultState = () => ({
  version: 3,
  settings: defaultSettings(),
  routines: seedRoutines(),
  workouts: [], // más reciente primero
  active: null, // entrenamiento en curso
  exerciseTypes: {}, // ejercicios creados por el usuario marcados como cardio
  profile: null, // { sex, birth, height, goalWeight, activity }
  weights: [], // [{ id, date: 'AAAA-MM-DD', kg, fat? }]  ordenados por fecha
  measures: [], // [{ id, date, neck?, chest?, waist?, hips?, arm?, thigh?, calf? }]
  chat: [], // conversación con el entrenador IA
});

// ---------- Persistencia ----------

function normalize(data) {
  const base = defaultState();
  const s = data.settings || {};
  // Migración a v3: añadir la rutina de casa a quien venga de una versión anterior
  if ((data.version || 1) < 3 && Array.isArray(data.routines) && !data.routines.some((r) => r.place === 'home')) {
    data.routines = [...data.routines, homeRoutine()];
  }
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...s, gym: { ...base.settings.gym, ...(s.gym || {}) } },
    routines: Array.isArray(data.routines) ? data.routines : base.routines,
    workouts: Array.isArray(data.workouts) ? data.workouts : [],
    active: data.active || null,
    exerciseTypes: data.exerciseTypes || {},
    profile: data.profile || null,
    weights: Array.isArray(data.weights) ? data.weights : [],
    measures: Array.isArray(data.measures) ? data.measures : [],
    chat: Array.isArray(data.chat) ? data.chat : [],
    version: 3,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn('No se pudieron leer los datos', e);
  }
  return defaultState();
}

export let state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudieron guardar los datos', e);
  }
}

/** Sustituye todos los datos (importar copia de seguridad) */
export function replaceState(data) {
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.routines)) {
    throw new Error('El archivo no es una copia válida de GymLog');
  }
  state = normalize(data);
  save();
}

export function resetState() {
  state = defaultState();
  save();
}

// ---------- Tipos de ejercicio ----------

const CARDIO_SET = new Set(CARDIO.map(norm));

/** 'cardio' o 'strength' */
export const exerciseType = (name) =>
  CARDIO_SET.has(norm(name)) || state.exerciseTypes[norm(name)] === 'cardio' ? 'cardio' : 'strength';

export function setExerciseType(name, type) {
  if (type === 'cardio') state.exerciseTypes[norm(name)] = 'cardio';
  else delete state.exerciseTypes[norm(name)];
  save();
}

// ---------- Cálculos ----------

/** 1RM estimado (fórmula de Epley) */
export const est1RM = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30));

const setVolume = (s) => (s.kg || 0) * (s.reps || 0);

/** Volumen total (kg × reps) de un entrenamiento */
export const volume = (w) =>
  w.exercises.reduce((t, e) => t + e.sets.reduce((a, s) => a + setVolume(s), 0), 0);

export const setCount = (w) => w.exercises.reduce((t, e) => t + e.sets.length, 0);

/** Series de la última vez que se hizo un ejercicio */
export function lastSets(name) {
  const n = norm(name);
  for (const w of state.workouts) {
    const ex = w.exercises.find((e) => norm(e.name) === n);
    if (ex) return ex.sets;
  }
  return null;
}

/** Peso máximo histórico de un ejercicio de fuerza (null si nunca se hizo) */
function bestKg(name) {
  const n = norm(name);
  let best = null;
  for (const w of state.workouts) {
    for (const e of w.exercises) {
      if (norm(e.name) !== n) continue;
      for (const s of e.sets) if (typeof s.kg === 'number') best = Math.max(best ?? 0, s.kg);
    }
  }
  return best;
}

/**
 * Sugerencia de progresión: si la última vez llegaste a las reps objetivo
 * en todas las series, propone subir el peso.
 * sets: series del entrenamiento actual (con su "target").
 */
export function suggestKg(name, sets) {
  if (exerciseType(name) !== 'strength') return null;
  const prev = lastSets(name);
  const targets = sets.map((s) => Number(s.target)).filter((t) => t > 0);
  if (!prev?.length || !targets.length) return null;
  const maxKg = Math.max(...prev.map((s) => s.kg || 0));
  if (!maxKg) return null; // peso corporal
  const ok = prev.length >= targets.length &&
    targets.every((t, i) => prev[i] && prev[i].reps >= t && prev[i].kg >= maxKg);
  return ok ? maxKg + state.settings.increment : null;
}

/**
 * Calculadora de discos: qué discos poner en CADA lado de la barra.
 * Devuelve { plates: [25, 10, ...], rest } — rest > 0 si no se puede exacto.
 */
export function plateCalc(total, bar = state.settings.bar, available = state.settings.plates) {
  let side = (total - bar) / 2;
  if (side <= 0) return { plates: [], rest: 0, side: 0 };
  const plates = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) {
      plates.push(p);
      side = Math.round((side - p) * 100) / 100;
    }
  }
  return { plates, rest: side, side: (total - bar) / 2 };
}

/** Todos los nombres de ejercicios conocidos */
export function exerciseNames() {
  const map = new Map();
  const add = (n) => { if (n && !map.has(norm(n))) map.set(norm(n), n); };
  state.workouts.forEach((w) => w.exercises.forEach((e) => add(e.name)));
  state.routines.forEach((r) => r.exercises.forEach((e) => add(e.name)));
  STRENGTH.forEach(add);
  CARDIO.forEach(add);
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Ejercicios con historial, ordenados por frecuencia */
export function trackedExercises() {
  const count = new Map();
  for (const w of state.workouts) {
    for (const e of w.exercises) {
      const k = norm(e.name);
      const c = count.get(k) || { name: e.name, n: 0 };
      c.n++;
      count.set(k, c);
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n).map((c) => c.name);
}

/** Evolución de un ejercicio, de más antiguo a más reciente */
export function exerciseHistory(name) {
  const n = norm(name);
  const cardio = exerciseType(name) === 'cardio';
  const out = [];
  for (const w of [...state.workouts].reverse()) {
    const ex = w.exercises.find((e) => norm(e.name) === n);
    if (!ex || !ex.sets.length) continue;
    if (cardio) {
      out.push({
        t: w.start,
        min: ex.sets.reduce((a, s) => a + (s.min || 0), 0),
        km: ex.sets.reduce((a, s) => a + (s.km || 0), 0),
      });
    } else {
      out.push({
        t: w.start,
        kg: Math.max(...ex.sets.map((s) => s.kg || 0)),
        rm: Math.max(...ex.sets.map((s) => est1RM(s.kg || 0, s.reps || 0))),
        vol: ex.sets.reduce((a, s) => a + setVolume(s), 0),
      });
    }
  }
  return out;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  return d;
}

/** Entrenamientos de la semana actual (lunes a domingo) */
export const weekWorkouts = () => {
  const from = startOfWeek().getTime();
  return state.workouts.filter((w) => w.start >= from);
};

/**
 * Racha: semanas seguidas cumpliendo el objetivo.
 * La semana actual solo cuenta si ya está cumplida.
 */
export function streak() {
  const goal = state.settings.weeklyGoal;
  const weeks = weeklyCounts(104).reverse(); // de la actual hacia atrás
  let n = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].count >= goal) n++;
    else if (i > 0) break; // la semana actual aún puede cumplirse
  }
  return n;
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export { dayKey, startOfWeek };
export const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Minutos entrenados por día: Map 'AAAA-M-D' → minutos */
export function dailyMinutes() {
  const map = new Map();
  for (const w of state.workouts) {
    const k = dayKey(new Date(w.start));
    map.set(k, (map.get(k) || 0) + Math.max(1, Math.round((w.end - w.start) / 60000)));
  }
  return map;
}

export function weekStats() {
  const ws = weekWorkouts();
  return {
    count: ws.length,
    volume: ws.reduce((t, w) => t + volume(w), 0),
    minutes: ws.reduce((t, w) => t + Math.round((w.end - w.start) / 60000), 0),
    total: state.workouts.length,
  };
}

/** Número de entrenamientos en cada una de las últimas n semanas */
export function weeklyCounts(n = 8) {
  const monday = startOfWeek();
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - 7 * (n - 1 - i));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      start: start.getTime(),
      count: state.workouts.filter((w) => w.start >= start.getTime() && w.start < end.getTime()).length,
    };
  });
}

// ---------- Horario del gimnasio ----------

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const hoursFor = (d) => {
  const g = state.settings.gym;
  const day = d.getDay();
  return day === 0 || day === 6 ? g.weekend : g.weekday;
};

/**
 * ¿Está abierto el gimnasio?
 * { open: true, closes: '23:00', left: minutos }  ó  { open: false, opens: '06:00', when: 'hoy'|'mañana' }
 */
export function gymStatus(now = new Date()) {
  const [o, c] = hoursFor(now);
  const open = toMin(o);
  let close = toMin(c);
  if (close <= open) close += 24 * 60; // cierra pasada la medianoche
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur >= open && cur < close) return { open: true, closes: c, left: close - cur };
  if (cur < open) return { open: false, opens: o, when: 'hoy' };
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { open: false, opens: hoursFor(tomorrow)[0], when: 'mañana' };
}

// ---------- Entrenamiento en curso ----------

const emptySet = (type, target = '') =>
  type === 'cardio'
    ? { min: '', km: '', done: false, target }
    : { kg: '', reps: '', done: false, target };

/**
 * Empieza un entrenamiento a partir de una plantilla
 * { name, routineId?, exercises: [{ name, sets, reps }] }
 */
export function startWorkout(template) {
  state.active = {
    id: uid(),
    name: template?.name || 'Entrenamiento libre',
    routineId: template?.routineId || null,
    place: template?.place || null, // 'gym' | 'home'
    placeSource: template?.place ? 'rutina' : null,
    start: Date.now(),
    restEnd: null,
    restTotal: 0,
    exercises: (template?.exercises || []).map((e) => {
      const type = exerciseType(e.name);
      return { name: e.name, type, sets: Array.from({ length: e.sets }, () => emptySet(type, e.reps)) };
    }),
  };
  save();
}

export function addExerciseToActive(name) {
  const type = exerciseType(name);
  const prev = lastSets(name);
  state.active.exercises.push({
    name,
    type,
    sets: Array.from({ length: prev?.length || (type === 'cardio' ? 1 : 3) }, () => emptySet(type)),
  });
  save();
}

export function addSet(exIndex) {
  const ex = state.active.exercises[exIndex];
  const last = ex.sets[ex.sets.length - 1];
  ex.sets.push(emptySet(ex.type || exerciseType(ex.name), last?.target ?? ''));
  save();
}

export function removeLastSet(exIndex) {
  const ex = state.active.exercises[exIndex];
  if (ex.sets.length > 1) ex.sets.pop();
  save();
}

export function discardWorkout() {
  state.active = null;
  save();
}

/** Guarda el entrenamiento en curso en el historial y lo devuelve */
export function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((e) => {
      const cardio = (e.type || exerciseType(e.name)) === 'cardio';
      return {
        name: e.name,
        sets: e.sets
          .filter((s) => s.done)
          .map((s) => cardio
            ? { min: Number(s.min) || 0, km: Number(s.km) || 0 }
            : { kg: Number(s.kg) || 0, reps: Number(s.reps) || 0 }),
      };
    })
    .filter((e) => e.sets.length);

  // Récords: supera el peso máximo anterior (la primera vez no cuenta)
  const prDetails = exercises
    .filter((e) => exerciseType(e.name) === 'strength')
    .map((e) => ({ name: e.name, kg: Math.max(...e.sets.map((s) => s.kg)), prev: bestKg(e.name) }))
    .filter((p) => p.prev !== null && p.kg > p.prev);
  const prs = prDetails.map((p) => p.name);

  const workout = {
    id: a.id,
    kind: 'gym',
    name: a.name,
    routineId: a.routineId,
    place: a.place || 'gym',
    start: a.start,
    end: Date.now(),
    exercises,
    prs,
    prDetails,
  };
  state.workouts.unshift(workout);
  state.active = null;
  save();
  return workout;
}

/** Registra una clase colectiva que acaba de terminar */
export function logClass(name, minutes) {
  const end = Date.now();
  const w = {
    id: uid(),
    kind: 'class',
    place: 'gym',
    name,
    start: end - minutes * 60000,
    end,
    exercises: [],
    prs: [],
  };
  state.workouts.unshift(w);
  state.workouts.sort((a, b) => b.start - a.start);
  save();
  return w;
}

export function deleteWorkout(id) {
  state.workouts = state.workouts.filter((w) => w.id !== id);
  save();
}

// ---------- Rutinas ----------

export function upsertRoutine(routine) {
  const clean = {
    id: routine.id,
    name: routine.name.trim(),
    color: routine.color || PALETTE[state.routines.length % PALETTE.length],
    ...(routine.place ? { place: routine.place } : {}),
    exercises: routine.exercises.map((e) => ({
      name: e.name,
      sets: Math.min(20, Math.max(1, parseInt(e.sets, 10) || 3)),
      reps: Math.min(300, Math.max(1, parseInt(e.reps, 10) || 10)),
    })),
  };
  const i = state.routines.findIndex((r) => r.id === clean.id);
  if (i >= 0) state.routines[i] = clean;
  else state.routines.push(clean);
  save();
}

export function deleteRoutine(id) {
  state.routines = state.routines.filter((r) => r.id !== id);
  save();
}

// =============================================================
//  Cuerpo: perfil, peso, medidas y composición corporal
// =============================================================

export const MEASURES = {
  neck: 'Cuello', chest: 'Pecho', waist: 'Cintura', hips: 'Cadera',
  arm: 'Brazo', thigh: 'Muslo', calf: 'Gemelo',
};

export const ACTIVITY = [
  [1.2, 'Sedentario', 'Poco o nada de ejercicio'],
  [1.375, 'Ligero', '1-3 días de ejercicio por semana'],
  [1.55, 'Moderado', '3-5 días de ejercicio por semana'],
  [1.725, 'Alto', '6-7 días de ejercicio por semana'],
  [1.9, 'Muy alto', 'Dos sesiones al día o trabajo físico'],
];

const pad = (n) => String(n).padStart(2, '0');
/** Fecha local en formato AAAA-MM-DD */
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Mediodía del día indicado (evita problemas con el cambio de hora) */
export const ymdTime = (s) => new Date(`${s}T12:00:00`).getTime();

const byDate = (a, b) => a.date.localeCompare(b.date);

export function saveProfile(p) {
  state.profile = { ...(state.profile || {}), ...p };
  save();
}

/** Registra un peso. Si ya había uno ese día, lo sustituye. Devuelve true si sustituyó. */
export function addWeight(date, kg, fat) {
  const replaced = state.weights.some((w) => w.date === date);
  state.weights = state.weights.filter((w) => w.date !== date);
  state.weights.push({ id: uid(), date, kg, ...(fat ? { fat } : {}) });
  state.weights.sort(byDate);
  save();
  return replaced;
}

export function deleteWeight(id) {
  state.weights = state.weights.filter((w) => w.id !== id);
  save();
}

/** Registra medidas (cm). Si ya había medidas ese día, se combinan. */
export function addMeasures(date, values) {
  const prev = state.measures.find((m) => m.date === date);
  state.measures = state.measures.filter((m) => m.date !== date);
  state.measures.push({ ...(prev || {}), id: prev?.id || uid(), date, ...values });
  state.measures.sort(byDate);
  save();
}

export function deleteMeasures(id) {
  state.measures = state.measures.filter((m) => m.id !== id);
  save();
}

/** Última medida registrada de cada tipo: { waist: { value, date }, ... } */
export function latestMeasures() {
  const out = {};
  for (const m of state.measures) {
    for (const k of Object.keys(MEASURES)) if (m[k]) out[k] = { value: m[k], date: m.date };
  }
  return out;
}

/** Serie de una medida concreta: [{ t, y }] */
export const measureSeries = (key) =>
  state.measures.filter((m) => m[key]).map((m) => ({ t: ymdTime(m.date), y: m[key] }));

/**
 * Peso de tendencia: media móvil exponencial (10 % por día).
 * Suaviza las variaciones diarias de agua y comida.
 */
export function weightTrend() {
  const out = [];
  let trend = null;
  let lastT = null;
  for (const w of state.weights) {
    const t = ymdTime(w.date);
    if (trend === null) trend = w.kg;
    else {
      const days = Math.max(1, Math.round((t - lastT) / 864e5));
      const a = 1 - Math.pow(0.9, days);
      trend += a * (w.kg - trend);
    }
    lastT = t;
    out.push({ ...w, t, trend });
  }
  return out;
}

export function age(birth = state.profile?.birth) {
  if (!birth) return null;
  const b = new Date(`${birth}T12:00:00`);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

/** % de grasa por el método de la Marina de EE. UU. (medidas en cm) */
export function navyBodyFat({ sex, height, neck, waist, hips }) {
  if (!height || !neck || !waist) return null;
  if (sex === 'f') {
    if (!hips || waist + hips - neck <= 0) return null;
    return 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(height)) - 450;
  }
  if (waist - neck <= 0) return null;
  return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
}

export function bmiCategory(bmi) {
  if (bmi < 18.5) return ['Bajo peso', 'low'];
  if (bmi < 25) return ['Normal', 'ok'];
  if (bmi < 30) return ['Sobrepeso', 'mid'];
  return ['Obesidad', 'high'];
}

/** Categorías del American Council on Exercise */
export function fatCategory(fat, sex) {
  const t = sex === 'f' ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (fat < t[0]) return ['Esencial', 'low'];
  if (fat < t[1]) return ['Atlético', 'ok'];
  if (fat < t[2]) return ['En forma', 'ok'];
  if (fat < t[3]) return ['Promedio', 'mid'];
  return ['Elevado', 'high'];
}

/** Tendencia en una fecha pasada (la del registro más cercano anterior) */
function trendAt(series, t) {
  let hit = null;
  for (const p of series) if (p.t <= t) hit = p;
  return hit;
}

/** Todo lo que se muestra en la pantalla Cuerpo */
export function bodyStats() {
  const p = state.profile || {};
  const series = weightTrend();
  const last = series[series.length - 1] || null;
  const trend = last?.trend ?? null;
  const day = 864e5;
  const now = last ? last.t : Date.now();

  const change = (days) => {
    const past = trendAt(series, now - days * day);
    return past && last && past !== last ? last.trend - past.trend : null;
  };

  // Ritmo semanal: tendencia de las últimas 4 semanas (mínimo 10 días de datos)
  let rate = null;
  if (last && series.length >= 3) {
    const ref = trendAt(series, now - 28 * day) || series[0];
    const span = (now - ref.t) / day;
    if (span >= 10) rate = ((last.trend - ref.trend) / span) * 7;
  }

  // Objetivo
  let eta = null;
  const goal = p.goalWeight || null;
  if (goal && trend != null && rate && Math.abs(rate) >= 0.05 && Math.sign(goal - trend) === Math.sign(rate)) {
    const weeks = (goal - trend) / rate;
    if (weeks < 260) eta = { weeks, date: now + weeks * 7 * day };
  }

  // Composición
  const h = p.height ? p.height / 100 : null;
  const bmi = h && trend ? trend / (h * h) : null;
  const m = latestMeasures();
  const navy = navyBodyFat({ sex: p.sex, height: p.height, neck: m.neck?.value, waist: m.waist?.value, hips: m.hips?.value });
  const scaleFat = [...state.weights].reverse().find((w) => w.fat)?.fat || null;
  const fat = navy ?? scaleFat;
  const lean = fat != null && trend ? trend * (1 - fat / 100) : null;
  const ffmi = lean && h ? lean / (h * h) + 6.1 * (1.8 - h) : null;

  const a = age();
  const bmr = trend && p.height && a != null
    ? 10 * trend + 6.25 * p.height - 5 * a + (p.sex === 'f' ? -161 : 5)
    : null;
  const tdee = bmr ? bmr * (p.activity || 1.55) : null;

  return {
    series, last, trend, goal, eta, rate,
    change7: change(7), change30: change(30),
    start: series[0] || null,
    bmi, bmiCat: bmi ? bmiCategory(bmi) : null,
    fat, fatSource: navy != null ? 'navy' : scaleFat != null ? 'scale' : null,
    fatCat: fat != null ? fatCategory(fat, p.sex) : null,
    lean, ffmi, bmr, tdee, age: a,
  };
}

// =============================================================
//  Casa o gimnasio
// =============================================================

/** 'gym' | 'home' | 'class' */
export const workoutPlace = (w) => (w.kind === 'class' ? 'class' : w.place || 'gym');

export function setWorkoutPlace(id, place) {
  const w = state.workouts.find((x) => x.id === id);
  if (w) { w.place = place; save(); }
}

/** Distancia en metros entre dos coordenadas (fórmula del haversine) */
export function distance(a, b) {
  const R = 6371e3;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Radio en metros dentro del cual se considera que estás en el gimnasio */
export const GYM_RADIUS = 300;

export function placeFromCoords(coords) {
  const g = state.settings.gymLoc;
  if (!g || !coords) return null;
  return distance(g, { lat: coords.latitude, lon: coords.longitude }) <= GYM_RADIUS + Math.min(coords.accuracy || 0, 200)
    ? 'gym' : 'home';
}

export function saveGymLocation(coords) {
  state.settings.gymLoc = coords
    ? { lat: coords.latitude, lon: coords.longitude, saved: Date.now() }
    : null;
  save();
}

/** Entrenos agrupados por día: Map 'AAAA-M-D' → [workouts] */
export function workoutsByDay() {
  const map = new Map();
  for (const w of state.workouts) {
    const k = dayKey(new Date(w.start));
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(w);
  }
  return map;
}

// =============================================================
//  Apariencia
// =============================================================

/** Colores principales que se pueden elegir */
export const THEMES = [
  ['#d4ff3a', 'Lima'], ['#3ddc84', 'Menta'], ['#2dd4bf', 'Turquesa'], ['#4da3ff', 'Azul'],
  ['#8b8cff', 'Índigo'], ['#c084fc', 'Lila'], ['#ff5f7e', 'Fresa'], ['#ff4d4d', 'Rojo'],
  ['#ff8a3d', 'Naranja'], ['#ffd43b', 'Oro'], ['#f3f4f6', 'Blanco'],
];

/** Aplica el color principal a toda la app */
export function applyTheme(color = state.settings.accent) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) color = '#d4ff3a';
  const n = parseInt(color.slice(1), 16);
  const root = document.documentElement.style;
  root.setProperty('--accent', color);
  root.setProperty('--accent-rgb', `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`);
  try { localStorage.setItem('gymlog:accent', color); } catch { /* sin almacenamiento */ }
}
