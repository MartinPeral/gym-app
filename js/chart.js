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

const FONT = '-apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const fmtDay = (t) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(t);
const fmtNum = (v, d = 1) => v.toLocaleString('es-ES', { maximumFractionDigits: d });

/**
 * Hace una gráfica "explorable": al tocar y arrastrar, resalta el punto
 * más cercano. xs son las posiciones X (px) de cada punto y redraw(i)
 * vuelve a dibujar resaltando el punto i (o ninguno si i es null).
 */
function bindScrub(canvas, xs, redraw) {
  canvas._scrub = { xs, redraw };
  if (canvas._bound) return;
  canvas._bound = true;
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'crosshair';
  let timer;
  const pick = (e) => {
    const s = canvas._scrub;
    if (!s?.xs.length) return;
    const x = e.clientX - canvas.getBoundingClientRect().left;
    let best = 0;
    s.xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(s.xs[best] - x)) best = i; });
    if (best !== canvas._hl) {
      canvas._hl = best;
      s.redraw(best);
    }
  };
  const release = () => {
    canvas._active = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (canvas._hl == null) return;
      canvas._hl = null;
      canvas._scrub.redraw(null);
    }, 2500);
  };
  canvas.addEventListener('pointerdown', (e) => { clearTimeout(timer); canvas._active = true; pick(e); });
  canvas.addEventListener('pointermove', (e) => { if (canvas._active || e.pointerType === 'mouse') pick(e); });
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
}

/** Etiqueta flotante con una o dos líneas, encima de (x, y) */
function tooltip(ctx, x, y, w, pad, main, sub) {
  ctx.font = `700 12px ${FONT}`;
  const mw = ctx.measureText(main).width;
  ctx.font = `600 10.5px ${FONT}`;
  const sw = sub ? ctx.measureText(sub).width : 0;
  const tw = Math.max(mw, sw) + 16;
  const th = sub ? 34 : 20;
  const lx = Math.min(Math.max(x - tw / 2, pad.l), w - pad.r - tw);
  const ly = Math.max(y - th - 10, 2);
  ctx.fillStyle = cssVar('--accent');
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(lx, ly, tw, th, 7) : ctx.rect(lx, ly, tw, th);
  ctx.fill();
  ctx.fillStyle = cssVar('--accent-ink');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (sub) {
    ctx.font = `600 10.5px ${FONT}`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(sub, lx + tw / 2, ly + 10);
    ctx.globalAlpha = 1;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(main, lx + tw / 2, ly + 24);
  } else {
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(main, lx + tw / 2, ly + 10.5);
  }
  ctx.font = `600 11px ${FONT}`;
}

/** Línea vertical guía en el punto resaltado */
function guide(ctx, x, top, bottom) {
  ctx.save();
  ctx.strokeStyle = rgba('#f3f4f6', 0.35);
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, top);
  ctx.lineTo(Math.round(x) + 0.5, bottom);
  ctx.stroke();
  ctx.restore();
}

/**
 * Gráfica de línea.
 * points: [{ t: timestamp, y: número }]
 */
export function lineChart(canvas, points, opts = {}) {
  const { unit = '', hl = null } = opts;
  const { ctx, w, h } = setup(canvas, 210);
  const accent = cssVar('--accent');
  const muted = cssVar('--muted');
  const grid = cssVar('--line');
  const bg = cssVar('--surface');

  const pad = { l: 42, r: 16, t: 40, b: 26 };
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
  ctx.textBaseline = 'alphabetic';
  const labels = points.length === 1 ? [0] : points.length > 4
    ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
    : [0, points.length - 1];
  labels.forEach((i, k) => {
    ctx.textAlign = points.length === 1 ? 'center' : k === 0 ? 'left' : k === labels.length - 1 ? 'right' : 'center';
    ctx.fillText(fmtDay(points[i].t), X(i), h - 6);
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

  if (hl != null) guide(ctx, X(hl), pad.t - 6, pad.t + ch);

  // Línea
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p.y)) : ctx.moveTo(X(i), Y(p.y))));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Puntos
  const focus = hl ?? points.length - 1;
  points.forEach((p, i) => {
    const on = i === focus;
    ctx.beginPath();
    ctx.arc(X(i), Y(p.y), on ? (hl != null ? 6 : 5) : 3, 0, Math.PI * 2);
    ctx.fillStyle = on ? accent : bg;
    ctx.fill();
    ctx.strokeStyle = on && hl != null ? bg : accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Etiqueta: el punto tocado (con fecha) o el último valor
  const fp = points[focus];
  const text = short(Math.round(fp.y * 10) / 10) + (unit ? ' ' + unit : '');
  tooltip(ctx, X(focus), Y(fp.y), w, pad, text, hl != null ? fmtDay(fp.t) : null);

  bindScrub(canvas, points.map((_, i) => X(i)), (i) => lineChart(canvas, points, { ...opts, hl: i }));
}

/**
 * Gráfica de barras.
 * data: [{ label: texto, value: número }]  — la última barra (o la tocada) se resalta
 */
export function barChart(canvas, data, opts = {}) {
  const { hl = null } = opts;
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
  const focus = hl ?? data.length - 1;

  data.forEach((d, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2;
    const bh = d.value ? Math.max(6, (d.value / max) * ch) : 3;
    const y = pad.t + ch - bh;
    const on = i === focus;
    ctx.fillStyle = on ? accent : bar;
    roundedTopRect(ctx, x, y, bw, bh, 6);
    ctx.fill();

    ctx.textAlign = 'center';
    if (d.value || on) {
      ctx.font = on ? `800 12px ${FONT}` : `600 11px ${FONT}`;
      ctx.fillStyle = on ? accent : muted;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(d.value, x + bw / 2, y - 5);
      ctx.font = `600 11px ${FONT}`;
    }
    ctx.fillStyle = on && hl != null ? cssVar('--text') : muted;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.label, x + bw / 2, h - 5);
  });

  bindScrub(canvas, data.map((_, i) => pad.l + slot * i + slot / 2), (i) => barChart(canvas, data, { ...opts, hl: i }));
}

/**
 * Gráfica de peso: puntos de cada pesada + línea de tendencia,
 * con el eje X proporcional al tiempo y línea de objetivo opcional.
 * points: [{ t, y }]   trend: [{ t, y }] (mismo orden)   goal: número | null
 */
export function bodyChart(canvas, points, trend, opts = {}) {
  const { goal = null, unit = 'kg', height = 220, hl = null } = opts;
  const { ctx, w, h } = setup(canvas, height);
  const accent = cssVar('--accent');
  const muted = cssVar('--muted');
  const grid = cssVar('--line');
  const pad = { l: 40, r: 16, t: 40, b: 26 };
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
  ctx.textBaseline = 'alphabetic';
  if (t1 === t0) {
    ctx.textAlign = 'center';
    ctx.fillText(fmtDay(t0), X(t0), h - 6);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(fmtDay(t0), pad.l, h - 6);
    ctx.textAlign = 'center';
    ctx.fillText(fmtDay((t0 + t1) / 2), pad.l + cw / 2, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText(fmtDay(t1), w - pad.r, h - 6);
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
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText(`Objetivo ${short(goal)} ${unit}`, pad.l + 6, y - 4);
    ctx.font = `600 11px ${FONT}`;
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

  if (hl != null) guide(ctx, X(points[hl].t), pad.t - 6, pad.t + ch);

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

  if (hl != null) {
    // Pesada tocada: punto grande + tendencia de ese día
    const p = points[hl];
    const tp = trend[hl];
    ctx.beginPath();
    ctx.arc(X(p.t), Y(p.y), 6, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--text');
    ctx.fill();
    if (tp) {
      ctx.beginPath();
      ctx.arc(X(tp.t), Y(tp.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
    tooltip(ctx, X(p.t), Math.min(Y(p.y), tp ? Y(tp.y) : Infinity), w, pad,
      `${fmtNum(p.y)} ${unit}${tp ? ` · tend. ${fmtNum(tp.y)}` : ''}`, fmtDay(p.t));
  } else {
    // Último valor de tendencia
    const lp = trend[trend.length - 1] || points[points.length - 1];
    ctx.beginPath();
    ctx.arc(X(lp.t), Y(lp.y), 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    tooltip(ctx, X(lp.t), Y(lp.y), w, pad, `${fmtNum(lp.y)} ${unit}`, null);
  }

  bindScrub(canvas, points.map((p) => X(p.t)), (i) => bodyChart(canvas, points, trend, { ...opts, hl: i }));
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
