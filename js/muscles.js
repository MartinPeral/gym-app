// =============================================================
//  muscles.js — Qué músculos trabaja cada ejercicio y el mapa
//  muscular (silueta SVG de frente y de espalda).
// =============================================================

import { norm, exerciseType } from './store.js';

export const MUSCLES = {
  pecho: 'Pecho',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazos: 'Antebrazos',
  abdomen: 'Abdomen',
  dorsales: 'Dorsales',
  trapecio: 'Trapecio',
  lumbar: 'Lumbar',
  gluteos: 'Glúteos',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquiotibiales',
  gemelos: 'Gemelos',
  aductores: 'Aductores',
};

// [principales, secundarios]
const MAP = {
  'press banca': [['pecho'], ['triceps', 'hombros']],
  'press inclinado con barra': [['pecho'], ['hombros', 'triceps']],
  'press inclinado con mancuernas': [['pecho'], ['hombros', 'triceps']],
  'aperturas con mancuernas': [['pecho'], []],
  'cruces en polea': [['pecho'], []],
  'contractora (pec deck)': [['pecho'], []],
  'fondos': [['pecho', 'triceps'], ['hombros']],
  'flexiones': [['pecho'], ['triceps', 'hombros']],
  'press militar': [['hombros'], ['triceps']],
  'press de hombro con mancuernas': [['hombros'], ['triceps']],
  'press de hombro en maquina': [['hombros'], ['triceps']],
  'elevaciones laterales': [['hombros'], []],
  'pajaros': [['hombros'], ['trapecio']],
  'face pull': [['hombros'], ['trapecio']],
  'dominadas': [['dorsales'], ['biceps', 'antebrazos']],
  'jalon al pecho': [['dorsales'], ['biceps']],
  'remo con barra': [['dorsales'], ['trapecio', 'biceps', 'lumbar']],
  'remo con mancuerna': [['dorsales'], ['trapecio', 'biceps']],
  'remo en polea baja': [['dorsales'], ['trapecio', 'biceps']],
  'remo en maquina': [['dorsales'], ['trapecio', 'biceps']],
  'pullover en polea': [['dorsales'], []],
  'curl con barra': [['biceps'], ['antebrazos']],
  'curl con mancuernas': [['biceps'], ['antebrazos']],
  'curl martillo': [['biceps', 'antebrazos'], []],
  'curl en banco scott': [['biceps'], []],
  'extension de triceps en polea': [['triceps'], []],
  'press frances': [['triceps'], []],
  'extension de triceps sobre la cabeza': [['triceps'], []],
  'sentadilla': [['cuadriceps'], ['gluteos', 'aductores']],
  'sentadilla en multipower': [['cuadriceps'], ['gluteos']],
  'sentadilla bulgara': [['cuadriceps', 'gluteos'], []],
  'sentadilla hack': [['cuadriceps'], ['gluteos']],
  'prensa': [['cuadriceps'], ['gluteos']],
  'zancadas': [['cuadriceps', 'gluteos'], []],
  'peso muerto': [['isquios', 'gluteos', 'lumbar'], ['trapecio', 'antebrazos']],
  'peso muerto rumano': [['isquios'], ['gluteos', 'lumbar']],
  'hip thrust': [['gluteos'], ['isquios']],
  'extension de cuadriceps': [['cuadriceps'], []],
  'curl femoral': [['isquios'], []],
  'abductores': [['gluteos'], []],
  'aductores': [['aductores'], []],
  'elevacion de gemelos': [['gemelos'], []],
  'plancha': [['abdomen'], []],
  'crunch en polea': [['abdomen'], []],
  'elevaciones de piernas colgado': [['abdomen'], []],
  'sentadilla sin peso': [['cuadriceps'], ['gluteos']],
  'puente de gluteo': [['gluteos'], ['isquios']],
  'fondos en silla': [['triceps'], ['pecho', 'hombros']],
  'flexiones diamante': [['triceps', 'pecho'], ['hombros']],
  'burpees': [['cuadriceps', 'pecho'], ['hombros', 'abdomen']],
  'mountain climbers': [['abdomen'], ['hombros', 'cuadriceps']],
  'superman': [['lumbar'], ['gluteos']],
  'abdominales (crunch)': [['abdomen'], []],
};

// Para ejercicios creados por ti: se adivina por palabras clave
const KEYWORDS = [
  [/femoral|isquio/, 'isquios'], [/gemelo/, 'gemelos'], [/aductor/, 'aductores'],
  [/gluteo|hip thrust|patada|abductor/, 'gluteos'], [/cuadriceps|sentadilla|prensa|zancada|extension de pierna/, 'cuadriceps'],
  [/triceps|frances|copa/, 'triceps'], [/curl|biceps/, 'biceps'], [/antebrazo|muneca/, 'antebrazos'],
  [/militar|hombro|lateral|deltoid|arnold/, 'hombros'], [/encogimiento|trapecio/, 'trapecio'],
  [/dominada|jalon|remo|pullover|dorsal/, 'dorsales'], [/lumbar|hiperextension/, 'lumbar'],
  [/press|pecho|apertura|cruce|flexion|fondo/, 'pecho'], [/abdominal|crunch|plancha|core/, 'abdomen'],
];

/** { primary: [...], secondary: [...] } de un ejercicio */
export function musclesFor(name) {
  if (exerciseType(name) === 'cardio') return { primary: [], secondary: [] };
  const n = norm(name);
  if (MAP[n]) return { primary: MAP[n][0], secondary: MAP[n][1] };
  const hit = KEYWORDS.find(([re]) => re.test(n));
  return { primary: hit ? [hit[1]] : [], secondary: [] };
}

/** Series por músculo (las secundarias cuentan media) en una lista de entrenamientos */
export function muscleSets(workouts) {
  const out = {};
  for (const w of workouts) {
    for (const e of w.exercises) {
      const { primary, secondary } = musclesFor(e.name);
      const n = e.sets.length;
      primary.forEach((m) => (out[m] = (out[m] || 0) + n));
      secondary.forEach((m) => (out[m] = (out[m] || 0) + n / 2));
    }
  }
  return out;
}

// ---------- Silueta ----------
// Las formas "left" se dibujan en el lado izquierdo y se reflejan
// automáticamente al derecho. Las "center" van una sola vez.

const FRONT = {
  base: `
    <ellipse cx="100" cy="34" rx="19" ry="24"/>
    <rect x="91" y="54" width="18" height="22" rx="7"/>
    <path d="M73,198 Q100,213 127,198 L129,213 Q100,224 71,213Z"/>`,
  baseSide: `
    <ellipse cx="43" cy="224" rx="7" ry="11"/>
    <ellipse cx="83" cy="296" rx="9" ry="7"/>
    <ellipse cx="82" cy="379" rx="11" ry="6"/>`,
  left: [
    ['trapecio', 'M92,70 Q82,77 72,83 L96,85Z'],
    ['hombros', 'M71,85 Q56,85 49,98 Q46,110 50,120 Q58,108 73,99 Q76,91 71,85Z'],
    ['pecho', 'M98,89 Q84,87 77,93 Q69,100 69,112 Q72,126 86,128 Q96,128 98,121Z'],
    ['biceps', 'M50,125 Q44,139 45,156 Q50,162 56,158 Q62,142 61,125 Q56,119 50,125Z'],
    ['antebrazos', 'M45,164 Q38,186 40,210 Q45,214 50,211 Q58,190 58,165 Q52,159 45,164Z'],
    ['abdomen', 'M85,132 Q75,138 74,158 Q75,180 85,195Z'],
    ['cuadriceps', 'M77,215 Q69,246 72,280 Q78,290 88,286 Q95,256 95,220 Q88,210 77,215Z'],
    ['aductores', 'M97,219 L99.5,219 L99.5,256 Q95,247 95,232Z'],
    ['gemelos', 'M75,306 Q70,334 76,366 Q82,370 86,366 Q91,334 90,306 Q82,301 75,306Z'],
  ],
  center: [
    ['abdomen', 'M87,132 Q100,129 113,132 L113,194 Q100,204 87,194Z'],
  ],
  lines: '<path d="M100,134 V198 M88,149 H112 M88,165 H112 M88,181 H112"/>',
};

const BACK = {
  base: `
    <ellipse cx="100" cy="34" rx="19" ry="24"/>
    <rect x="91" y="54" width="18" height="16" rx="7"/>`,
  baseSide: `
    <ellipse cx="43" cy="224" rx="7" ry="11"/>
    <ellipse cx="83" cy="298" rx="8" ry="5"/>
    <ellipse cx="82" cy="379" rx="11" ry="6"/>`,
  left: [
    ['hombros', 'M71,85 Q56,85 49,98 Q46,110 50,120 Q58,108 73,99 Q76,91 71,85Z'],
    ['dorsales', 'M98,126 Q88,106 73,101 Q66,122 76,150 Q86,166 98,172Z'],
    ['triceps', 'M50,125 Q44,139 45,156 Q50,162 56,158 Q62,142 61,125 Q56,119 50,125Z'],
    ['antebrazos', 'M45,164 Q38,186 40,210 Q45,214 50,211 Q58,190 58,165 Q52,159 45,164Z'],
    ['gluteos', 'M98.5,203 Q82,199 75,213 Q72,233 86,241 Q98,241 98.5,229Z'],
    ['isquios', 'M76,247 Q70,268 74,291 Q82,297 88,291 Q96,268 97,247 Q88,241 76,247Z'],
    ['gemelos', 'M75,306 Q68,326 74,350 Q82,358 88,350 Q94,326 90,306 Q82,301 75,306Z'],
  ],
  center: [
    ['trapecio', 'M100,62 L88,77 Q76,81 70,88 Q86,94 100,122 Q114,94 130,88 Q124,81 112,77Z'],
    ['lumbar', 'M89,177 Q100,181 111,177 L113,199 Q100,203 87,199Z'],
  ],
  lines: '<path d="M100,124 V176"/>',
};

/**
 * Pinta la silueta.
 * sets: { musculo: series }   steps: umbrales [nivel 2, nivel 3]
 */
export function bodyMap(sets, steps = [4, 10]) {
  const level = (n) => (!n ? 0 : n < steps[0] ? 1 : n < steps[1] ? 2 : 3);
  const shape = ([m, d]) => {
    const n = sets[m] || 0;
    return `<path d="${d}" class="m l${level(n)}" data-action="muscle" data-m="${m}" data-n="${n}"><title>${MUSCLES[m]}</title></path>`;
  };
  const view = (v, label) => `
    <figure class="body-view">
      <svg viewBox="32 6 136 384" role="img" aria-label="Mapa muscular, vista ${label.toLowerCase()}">
        <g class="base">${v.base}${v.baseSide}<g transform="translate(200 0) scale(-1 1)">${v.baseSide}</g></g>
        ${v.left.map(shape).join('')}
        <g transform="translate(200 0) scale(-1 1)">${v.left.map(shape).join('')}</g>
        ${v.center.map(shape).join('')}
        <g class="lines">${v.lines}</g>
      </svg>
      <figcaption>${label}</figcaption>
    </figure>`;
  return `<div class="body-map">${view(FRONT, 'Frente')}${view(BACK, 'Espalda')}</div>`;
}

/** Lista de músculos trabajados, de más a menos series */
export function muscleList(sets, max = 6) {
  const rows = Object.entries(sets).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (!rows.length) return '';
  const top = rows[0][1];
  const fmt = (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  return `<ul class="muscle-list">${rows.map(([m, n]) => `
    <li><span>${MUSCLES[m]}</span><i><b style="width:${(n / top) * 100}%"></b></i><em>${fmt(n)}</em></li>`).join('')}</ul>`;
}
