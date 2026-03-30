// ===== LOCK IN — Canvas Charts =====
// Zero-dependency chart rendering using the HTML5 Canvas API.

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  bg:       '#1a1a2e',
  grid:     'rgba(255,255,255,0.06)',
  text:     'rgba(255,255,255,0.5)',
  textMain: 'rgba(255,255,255,0.9)',
  purple:   '#6c63ff',
  teal:     '#00d4aa',
  red:      '#ff6b6b',
  yellow:   '#ffd93d',
  orange:   '#ff8c00',
  green:    '#6bcb77',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dpr() { return window.devicePixelRatio || 1; }

/** Sets canvas to physical pixel resolution and returns 2D context */
function setupCanvas(canvas) {
  const rect  = canvas.getBoundingClientRect();
  const ratio = dpr();
  canvas.width  = rect.width  * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  return { ctx, w: rect.width, h: rect.height };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Donut / Ring Chart ───────────────────────────────────────────────────────

/**
 * Draws a habit-completion ring.
 * @param {HTMLCanvasElement} canvas
 * @param {number} pct  - 0-100
 * @param {string} color - hex colour for the arc
 */
export function drawRing(canvas, pct, color = C.purple) {
  const { ctx, w, h } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) / 2 - 8;
  const lineW = Math.max(8, r * 0.18);

  ctx.clearRect(0, 0, w, h);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = lineW;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Progress arc
  if (pct > 0) {
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + (pct / 100) * Math.PI * 2;

    // Glow
    ctx.save();
    ctx.shadowColor  = color;
    ctx.shadowBlur   = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineW;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

/**
 * Draws a multi-series line chart.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {Array<{label: string, data: number[], color: string}>} opts.series
 * @param {string[]}  opts.labels       - X-axis labels
 * @param {string}    [opts.yUnit]      - unit appended to Y values
 * @param {number}    [opts.yMin]       - override min Y
 * @param {number}    [opts.yMax]       - override max Y
 */
export function drawLineChart(canvas, opts) {
  const { ctx, w, h } = setupCanvas(canvas);
  const { series, labels, yUnit = '', yMin, yMax } = opts;

  if (!series || series.length === 0) return;

  const pad = { top: 20, right: 16, bottom: 36, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  // Compute global min/max across all series
  const allVals = series.flatMap(s => s.data).filter(v => v !== null && v !== undefined);
  if (!allVals.length) return;
  const dataMin = yMin !== undefined ? yMin : Math.min(...allVals);
  const dataMax = yMax !== undefined ? yMax : Math.max(...allVals);
  const valRange = dataMax - dataMin || 1;

  const xOf = (i)  => pad.left + (i / Math.max(labels.length - 1, 1)) * chartW;
  const yOf = (val) => pad.top  + chartH - ((val - dataMin) / valRange) * chartH;

  // Grid lines
  const gridLines = 4;
  ctx.font = `${11 * dpr() / dpr()}px system-ui`;
  ctx.fillStyle = C.text;
  ctx.textAlign  = 'right';

  for (let i = 0; i <= gridLines; i++) {
    const val = dataMin + (valRange * i) / gridLines;
    const y   = yOf(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.fillText(Math.round(val) + yUnit, pad.left - 6, y + 4);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const step = Math.ceil(labels.length / 8); // max ~8 labels
  for (let i = 0; i < labels.length; i += step) {
    ctx.fillStyle = C.text;
    ctx.fillText(labels[i], xOf(i), pad.top + chartH + 20);
  }

  // Series lines + dots
  for (const s of series) {
    const pts = s.data.map((v, i) => ({ x: xOf(i), y: yOf(v), valid: v !== null }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, s.color + '40');
    grad.addColorStop(1, s.color + '00');

    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      if (!p.valid) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    // Fill area below line
    const lastValid = [...pts].reverse().find(p => p.valid);
    const firstValid = pts.find(p => p.valid);
    if (firstValid && lastValid) {
      ctx.lineTo(lastValid.x, pad.top + chartH);
      ctx.lineTo(firstValid.x, pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    started = false;
    for (const p of pts) {
      if (!p.valid) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowColor = s.color;
    ctx.shadowBlur  = 6;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Dots
    for (const p of pts) {
      if (!p.valid) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
  }
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

/**
 * Draws a simple bar chart.
 * @param {HTMLCanvasElement} canvas
 * @param {{labels: string[], values: number[], colors: string[], maxVal?: number}} opts
 */
export function drawBarChart(canvas, opts) {
  const { ctx, w, h } = setupCanvas(canvas);
  const { labels, values, colors, maxVal } = opts;

  if (!values || values.length === 0) return;

  const pad  = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const max = maxVal || Math.max(...values, 1);
  const barW  = (chartW / values.length) * 0.65;
  const gap   = (chartW / values.length) * 0.35;

  const yOf = (val) => pad.top + chartH - (val / max) * chartH;

  // Y-axis grid
  ctx.font      = '11px system-ui';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = (max * i) / 4;
    const y   = yOf(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText(Math.round(val), pad.left - 6, y + 4);
  }

  for (let i = 0; i < values.length; i++) {
    const x   = pad.left + i * (chartW / values.length) + gap / 2;
    const val = values[i];
    const barH = (val / max) * chartH;
    const y   = pad.top + chartH - barH;
    const col = (colors && colors[i]) ? colors[i] : C.purple;

    // Bar glow
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur  = 8;
    const radius = Math.min(6, barW / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [radius, radius, 2, 2]);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();

    // Label
    ctx.textAlign  = 'center';
    ctx.fillStyle  = C.text;
    ctx.fillText(labels[i] || '', x + barW / 2, pad.top + chartH + 20);
  }
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

/**
 * Draws a semi-circular gauge for the Lock In Score.
 * @param {HTMLCanvasElement} canvas
 * @param {number} score - 0-100
 * @param {string} color
 */
export function drawScoreGauge(canvas, score, color = C.purple) {
  const { ctx, w, h } = setupCanvas(canvas);
  const cx  = w / 2;
  const cy  = h * 0.78;
  const r   = Math.min(w, h) * 0.42;
  const lw  = r * 0.16;

  ctx.clearRect(0, 0, w, h);

  const startA = Math.PI * 0.85;
  const endA   = Math.PI * 2.15;
  const range  = endA - startA;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Progress
  if (score > 0) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + (score / 100) * range);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Score text
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `bold ${Math.round(r * 0.52)}px system-ui`;
  ctx.fillStyle    = C.textMain;
  ctx.fillText(score, cx, cy - r * 0.12);

  ctx.font      = `${Math.round(r * 0.2)}px system-ui`;
  ctx.fillStyle = C.text;
  ctx.fillText('/ 100', cx, cy + r * 0.22);
}

// ─── Calendar Heatmap ─────────────────────────────────────────────────────────

/**
 * Draws a 5-week calendar heatmap for a habit.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{date: string, completed: boolean, isToday: boolean}>} days
 * @param {string} color - accent colour for completed cells
 */
export function drawCalendarHeatmap(canvas, days, color = C.purple) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const cols = 7;  // days of week
  const rows = Math.ceil(days.length / 7);
  const cellW = (w - 2) / cols;
  const cellH = (h - 2) / rows;
  const gap   = 3;
  const r     = 5;

  for (let i = 0; i < days.length; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x   = 1 + col * cellW + gap / 2;
    const y   = 1 + row * cellH + gap / 2;
    const cw  = cellW - gap;
    const ch  = cellH - gap;

    const day = days[i];
    let fill;
    if (day.isToday)      fill = color + 'cc';
    else if (day.completed) fill = color + '99';
    else                    fill = 'rgba(255,255,255,0.05)';

    if (day.isToday) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, r);
    ctx.fillStyle = fill;
    ctx.fill();

    if (day.isToday) ctx.restore();

    // Today outline
    if (day.isToday) {
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, r);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }
}

// ─── Auto-resize observer ─────────────────────────────────────────────────────

/**
 * Re-renders a chart when its canvas is resized.
 * Call once after rendering to keep the chart sharp when layout changes.
 */
export function observeResize(canvas, renderFn) {
  if (!('ResizeObserver' in window)) return;
  const ro = new ResizeObserver(() => renderFn());
  ro.observe(canvas);
  return ro; // caller can disconnect if needed
}
