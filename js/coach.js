// =============================================================
//  coach.js — Entrenador IA: resumen de tus datos, llamada al
//  servidor (Cloudflare Worker) y formato de las respuestas.
// =============================================================

import * as S from './store.js';
import { MUSCLES, muscleSets } from './muscles.js';

/** Dirección del servidor. Se puede cambiar en Ajustes. */
export const DEFAULT_AI_URL = 'https://gymlog-ai.martinperal10.workers.dev';

export const aiUrl = () => (S.state.settings.aiUrl || DEFAULT_AI_URL).trim();

const n1 = (v) => Number(v).toLocaleString('es-ES', { maximumFractionDigits: 1 });
const fdate = (t, o = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('es-ES', o).format(new Date(t));
const PLACE = { gym: 'gimnasio', home: 'casa', class: 'clase' };

function setText(name, s) {
  if (S.exerciseType(name) === 'cardio') return `${n1(s.min)} min${s.km ? ` ${n1(s.km)} km` : ''}`;
  return `${n1(s.kg)}×${s.reps}`;
}

/**
 * Resumen compacto de los datos del usuario para el modelo.
 * Solo se envía al hacer una pregunta.
 */
export function buildContext() {
  const st = S.state;
  const lines = [];
  const now = new Date();
  lines.push(`FECHA: ${fdate(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);

  // Perfil y cuerpo
  const p = st.profile;
  if (p) {
    const b = S.bodyStats();
    const parts = [
      p.sex === 'f' ? 'mujer' : 'hombre',
      b.age != null ? `${b.age} años` : null,
      p.height ? `${p.height} cm` : null,
      b.trend ? `peso de tendencia ${n1(b.trend)} kg` : null,
      b.rate != null ? `ritmo ${b.rate > 0 ? '+' : ''}${n1(b.rate)} kg/semana` : null,
      p.goalWeight ? `peso objetivo ${n1(p.goalWeight)} kg` : null,
      b.fat != null ? `grasa ~${n1(b.fat)} %` : null,
      b.bmi ? `IMC ${n1(b.bmi)}` : null,
      b.tdee ? `mantenimiento ~${Math.round(b.tdee / 10) * 10} kcal/día` : null,
      `actividad: ${(S.ACTIVITY.find((a) => a[0] === p.activity) || S.ACTIVITY[2])[1].toLowerCase()}`,
    ].filter(Boolean);
    lines.push(`PERFIL: ${parts.join(', ')}.`);
    const lm = S.latestMeasures();
    const meas = Object.entries(S.MEASURES).filter(([k]) => lm[k]).map(([k, l]) => `${l.toLowerCase()} ${n1(lm[k].value)}`);
    if (meas.length) lines.push(`MEDIDAS (cm): ${meas.join(', ')}.`);
  } else {
    lines.push('PERFIL: no configurado (sin edad, altura ni peso).');
  }

  // Gimnasio y objetivo semanal
  const g = st.settings.gym;
  if (g.name) {
    const gs = S.gymStatus();
    lines.push(`GIMNASIO: ${g.name}. Horario L-V ${g.weekday.join('-')}, S-D ${g.weekend.join('-')}. Ahora ${gs.open ? `abierto (cierra ${gs.closes})` : `cerrado (abre ${gs.when} ${gs.opens})`}.`);
  }
  const week = S.weekWorkouts();
  lines.push(`OBJETIVO SEMANAL: ${st.settings.weeklyGoal} entrenos. Esta semana lleva ${week.length}${week.length ? `: ${week.map((w) => `${fdate(w.start, { weekday: 'short' })} ${w.name} (${PLACE[S.workoutPlace(w)]})`).join(', ')}` : ''}.`);

  // Músculos trabajados (7 días)
  const since = Date.now() - 7 * 864e5;
  const ms = muscleSets(st.workouts.filter((w) => w.start >= since));
  const msList = Object.keys(MUSCLES).map((m) => `${MUSCLES[m]} ${n1(ms[m] || 0)}`);
  lines.push(`SERIES POR MÚSCULO (últimos 7 días): ${msList.join(', ')}.`);

  // Rutinas
  if (st.routines.length) {
    lines.push('RUTINAS GUARDADAS:');
    st.routines.forEach((r) => lines.push(`- ${r.name}${r.place ? ` [${PLACE[r.place]}]` : ''}: ${r.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`).join(', ')}`));
  }

  // Últimos entrenos
  const recent = st.workouts.slice(0, 10);
  if (recent.length) {
    lines.push(`ÚLTIMOS ENTRENOS (${recent.length} de ${st.workouts.length} en total):`);
    recent.forEach((w) => {
      const mins = Math.round((w.end - w.start) / 60000);
      const ex = w.exercises.map((e) => `${e.name} ${e.sets.map((s) => setText(e.name, s)).join(', ')}`).join('; ');
      lines.push(`- ${fdate(w.start)}: ${w.name} (${PLACE[S.workoutPlace(w)]}, ${mins} min)${ex ? `: ${ex}` : ''}${w.prs?.length ? ` [récord en ${w.prs.join(', ')}]` : ''}`);
    });
  } else {
    lines.push('ÚLTIMOS ENTRENOS: ninguno registrado todavía.');
  }

  // Evolución por ejercicio
  const tracked = S.trackedExercises().slice(0, 15);
  if (tracked.length) {
    lines.push('EVOLUCIÓN POR EJERCICIO (primera → última sesión, máximos):');
    tracked.forEach((name) => {
      const h = S.exerciseHistory(name);
      if (!h.length) return;
      const a = h[0];
      const z = h[h.length - 1];
      if (S.exerciseType(name) === 'cardio') {
        lines.push(`- ${name}: ${h.length} sesiones; última ${n1(z.min)} min ${n1(z.km)} km (${fdate(z.t)})`);
      } else {
        const best = Math.max(...h.map((x) => x.kg));
        lines.push(`- ${name}: ${h.length} sesiones; ${n1(a.kg)} → ${n1(z.kg)} kg (máx ${n1(best)} kg, 1RM est ${n1(z.rm)}), última ${fdate(z.t)}`);
      }
    });
  }

  lines.push(`AJUSTES: descanso ${st.settings.restSeconds}s, subida sugerida ${n1(st.settings.increment)} kg, barra ${st.settings.bar} kg.`);
  lines.push(`EJERCICIOS DISPONIBLES: ${S.exerciseNames().join(', ')}.`);
  return lines.join('\n');
}

/** Pregunta al entrenador. Devuelve el texto de la respuesta o lanza un error legible. */
export async function askCoach(messages) {
  const url = aiUrl();
  if (!url) throw new Error('Configura primero la dirección del servidor en Ajustes.');
  if (!navigator.onLine) throw new Error('Sin conexión. El entrenador necesita internet.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: buildContext(),
        messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'El entrenador tarda demasiado en responder. Prueba otra vez.'
      : 'No se pudo conectar con el servidor. Revisa la dirección en Ajustes.');
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try { data = await res.json(); } catch { /* respuesta no JSON */ }
  if (res.status === 429) throw new Error('Se ha agotado el uso gratuito de hoy. Mañana vuelve a funcionar.');
  if (res.status === 403) throw new Error('El servidor no acepta peticiones desde esta dirección.');
  if (!res.ok || !data?.reply) throw new Error(data?.message ? `Error del servidor: ${data.message}` : 'El servidor no ha devuelto una respuesta válida.');
  return data.reply;
}

// ---------- Rutinas propuestas por la IA ----------

const ROUTINE_RE = /```\s*rutina\s*\n?([\s\S]*?)```/i;

/**
 * Separa el texto de la rutina propuesta.
 * Devuelve { text, routine } con routine = { name, place, exercises } o null.
 */
export function splitRoutine(reply) {
  const m = reply.match(ROUTINE_RE);
  if (!m) return { text: reply, routine: null };
  const text = reply.replace(ROUTINE_RE, '').trim();
  try {
    const raw = JSON.parse(m[1].trim());
    const exercises = (raw.ejercicios || raw.exercises || [])
      .map((e) => ({
        name: String(e.nombre || e.name || '').trim().slice(0, 60),
        sets: Math.min(20, Math.max(1, parseInt(e.series ?? e.sets, 10) || 3)),
        reps: Math.min(300, Math.max(1, parseInt(e.reps, 10) || 10)),
      }))
      .filter((e) => e.name);
    if (!exercises.length) return { text, routine: null };
    // Usar el nombre del catálogo si coincide (sin tildes ni mayúsculas)
    const known = new Map(S.exerciseNames().map((n) => [S.norm(n), n]));
    exercises.forEach((e) => { e.name = known.get(S.norm(e.name)) || e.name; });
    const place = ['gym', 'home'].includes(raw.lugar ?? raw.place) ? (raw.lugar ?? raw.place) : null;
    return {
      text,
      routine: { name: String(raw.nombre || raw.name || 'Rutina del entrenador').trim().slice(0, 40), place, exercises: exercises.slice(0, 12) },
    };
  } catch {
    return { text: text || reply, routine: null };
  }
}

// ---------- Formato de las respuestas (markdown sencillo y seguro) ----------

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderMarkdown(md) {
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) {
      flushPara(); closeList();
      out.push(`<h4>${inline(m[1])}</h4>`);
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return out.join('');
}
