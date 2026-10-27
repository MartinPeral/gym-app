// =============================================================
//  chart.js — Gráficas dibujadas con <canvas> (sin librerías)
// =============================================================

const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function rgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Prepara el canvas para pantallas retina */
function setup(canvas, height) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  canvas.style.height = height + 'px';
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  return { ctx, w: width, h: height };
}

/** Escala "bonita" para el eje Y (pasos de 1, 2, 5, 10…) */
function niceScale(min, max, ticks = 4) {
  if (min === max) {
    max = max === 0 ? 1 : max * 1.1;
    min = min * 0.9;
  }
  const raw = (max - min) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
  return {
    lo: Math.max(0, Math.floor(min / step) * step),
    hi: Math.ceil(max / step) * step,
    step,
  };
}

const short = (v) =>
  v >= 10000
    ? Math.round(v / 1000) + 'k'
    : v.toLocaleString('es-ES', { maximumFractionDigits: 1 });

function roundedTopRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/**
 * Gráfica de línea.
 * points: [{ t: timestamp, y: número }]
 */
export function lineChart(canvas, points, { unit = '' } = {}) {
  const { ctx, w, h } = setup(canvas, 210);
  const accent = cssVar('--accent');
  const muted = cssVar('--muted');
  const grid = cssVar('--line');
  const bg = cssVar('--surface');

  const pad = { l: 42, r: 16, t: 26, b: 26 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  if (!points.length) {
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos todavía', w / 2, h / 2);
    return;
  }

  const ys = points.map((p) => p.y);
  const { lo, hi, step } = niceScale(Math.min(...ys), Math.max(...ys));
  const X = (i) => (points.length === 1 ? pad.l + cw / 2 : pad.l + (i / (points.length - 1)) * cw);
  const Y = (v) => pad.t + ch - ((v - lo) / (hi - lo)) * ch;

  // Rejilla y eje Y
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) {
    const v = lo + i * step;
    const y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = grid;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.fillText(short(v), pad.l - 8, y);
  }

  // Eje X: primera, intermedia y última fecha
  const fmt = (t) =>
    new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(t);
  ctx.textBaseline = 'alphabetic';
  const labels = points.length === 1 ? [0] : points.length > 4
    ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
    : [0, points.length - 1];
  labels.forEach((i, k) => {
    ctx.textAlign = points.length === 1 ? 'center' : k === 0 ? 'left' : k === labels.length - 1 ? 'right' : 'center';
    ctx.fillText(fmt(points[i].t), X(i), h - 6);
  });

  // Área degradada
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, rgba(accent, 0.28));
  grad.addColorStop(1, rgba(accent, 0));
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p.y)) : ctx.moveTo(X(i), Y(p.y))));
  ctx.lineTo(X(points.length - 1), pad.t + ch);
  ctx.lineTo(X(0), pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Línea
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p.y)) : ctx.moveTo(X(i), Y(p.y))));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Puntos
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    ctx.beginPath();
    ctx.arc(X(i), Y(p.y), last ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = last ? accent : bg;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Etiqueta del último valor
  const lp = points[points.length - 1];
  const text = short(Math.round(lp.y * 10) / 10) + (unit ? ' ' + unit : '');
  ctx.font = '700 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 12;
  const lx = Math.min(Math.max(X(points.length - 1) - tw / 2, pad.l), w - pad.r - tw);
  const ly = Math.max(Y(lp.y) - 28, 2);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(lx, ly, tw, 20, 6) : ctx.rect(lx, ly, tw, 20);
  ctx.fill();
  ctx.fillStyle = cssVar('--accent-ink');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + tw / 2, ly + 10.5);
}

/**
 * Gráfica de barras.
 * data: [{ label: texto, value: número }]  — la última barra se resalta
 */
export function barChart(canvas, data) {
  const { ctx, w, h } = setup(canvas, 150);
  const accent = cssVar('--accent');
  const muted = cssVar('--muted');
  const bar = cssVar('--surface-3');

  const pad = { l: 4, r: 4, t: 18, b: 22 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = cw / data.length;
  const bw = Math.min(28, slot * 0.6);

  data.forEach((d, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2;
    const bh = d.value ? Math.max(6, (d.value / max) * ch) : 3;
    const y = pad.t + ch - bh;
    const last = i === data.length - 1;
    ctx.fillStyle = last ? accent : bar;
    roundedTopRect(ctx, x, y, bw, bh, 6);
    ctx.fill();

    ctx.textAlign = 'center';
    if (d.value) {
      ctx.fillStyle = last ? accent : muted;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(d.value, x + bw / 2, y - 5);
    }
    ctx.fillStyle = muted;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.label, x + bw / 2, h - 5);
  });
}

/**
 * Gráfica de peso: puntos de cada pesada + línea de tendencia,
 * con el eje X proporcional al tiempo y línea de objetivo opcional.
 * points: [{ t, y }]   trend: [{ t, y }]   goal: número | null
 */
export function bodyChart(canvas, points, trend, { goal = null, unit = 'kg', height = 220 } = {}) {
  const { ctx, w, h } = setup(canvas, height);
  const accent = cssVar('--accent');
  const muted = cssVar('--muted');
  const grid = cssVar('--line');
  const pad = { l: 40, r: 16, t: 26, b: 26 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  if (!points.length) {
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.fillText('Sin registros en este periodo', w / 2, h / 2);
    return;
  }

  const ys = [...points.map((p) => p.y), ...trend.map((p) => p.y)];
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  // Incluir el objetivo si está razonablemente cerca
  const showGoal = goal && Math.abs(goal - (goal < min ? min : max)) <= Math.max(4, (max - min) * 1.5);
  if (showGoal) { min = Math.min(min, goal); max = Math.max(max, goal); }
  const span = Math.max(max - min, 1);
  const { lo, hi, step } = niceScale(min - span * 0.08, max + span * 0.08, 4);

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const X = (t) => (t1 === t0 ? pad.l + cw / 2 : pad.l + ((t - t0) / (t1 - t0)) * cw);
  const Y = (v) => pad.t + ch - ((v - lo) / (hi - lo)) * ch;

  // Rejilla
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) {
    const v = lo + i * step;
    const y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = grid;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.fillText(short(v), pad.l - 8, y);
  }

  // Fechas
  const fmt = (t) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(t);
  ctx.textBaseline = 'alphabetic';
  if (t1 === t0) {
    ctx.textAlign = 'center';
    ctx.fillText(fmt(t0), X(t0), h - 6);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(fmt(t0), pad.l, h - 6);
    ctx.textAlign = 'center';
    ctx.fillText(fmt((t0 + t1) / 2), pad.l + cw / 2, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(t1), w - pad.r, h - 6);
  }

  // Objetivo (línea discontinua)
  if (showGoal) {
    const y = Y(goal);
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = cssVar('--ok');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = cssVar('--ok');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillText(`Objetivo ${short(goal)} ${unit}`, pad.l + 6, y - 4);
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  }

  // Área bajo la tendencia
  if (trend.length > 1) {
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grad.addColorStop(0, rgba(accent, 0.22));
    grad.addColorStop(1, rgba(accent, 0));
    ctx.beginPath();
    trend.forEach((p, i) => (i ? ctx.lineTo(X(p.t), Y(p.y)) : ctx.moveTo(X(p.t), Y(p.y))));
    ctx.lineTo(X(trend[trend.length - 1].t), pad.t + ch);
    ctx.lineTo(X(trend[0].t), pad.t + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Pesadas (puntos pequeños)
  ctx.fillStyle = rgba('#8a919a', 0.75);
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(X(p.t), Y(p.y), points.length > 60 ? 2 : 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tendencia
  if (trend.length > 1) {
    ctx.beginPath();
    trend.forEach((p, i) => (i ? ctx.lineTo(X(p.t), Y(p.y)) : ctx.moveTo(X(p.t), Y(p.y))));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Último valor de tendencia
  const lp = trend[trend.length - 1] || points[points.length - 1];
  ctx.beginPath();
  ctx.arc(X(lp.t), Y(lp.y), 5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  const text = `${lp.y.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}`;
  ctx.font = '700 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 12;
  const lx = Math.min(Math.max(X(lp.t) - tw / 2, pad.l), w - pad.r - tw);
  const ly = Math.max(Y(lp.y) - 30, 2);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(lx, ly, tw, 20, 6) : ctx.rect(lx, ly, tw, 20);
  ctx.fill();
  ctx.fillStyle = cssVar('--accent-ink');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + tw / 2, ly + 10.5);
}

/** Minigráfica en SVG (para las medidas) */
export function sparkline(values, { w = 80, h = 26, color = 'var(--accent)' } = {}) {
  if (values.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 6) + 3,
    h - 3 - ((v - min) / r) * (h - 6),
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly}" r="3" fill="${color}"/></svg>`;
}
