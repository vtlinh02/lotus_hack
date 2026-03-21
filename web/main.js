import ModuleFactory from "../wasm/warp_sim.js";

const Module = await ModuleFactory();

const mandelCanvas = document.getElementById("mandelCanvas");
const mandelCtx = mandelCanvas.getContext("2d");

const traceCanvas = document.getElementById("traceCanvas");
const traceCtx = traceCanvas.getContext("2d");

const mandelMeta = document.getElementById("mandelMeta");
const traceMeta = document.getElementById("traceMeta");

const memoryCanvas = document.getElementById("memoryCanvas");
const memoryCtx = memoryCanvas.getContext("2d");
const memoryMeta = document.getElementById("memoryMeta");

const patternSelect = document.getElementById("patternSelect");
const baseAddressInput = document.getElementById("baseAddressInput");

const view = {
  x_min: -2.0,
  x_max: 1.0,
  y_min: -1.0,
  y_max: 1.0,
  max_iter: 128,
};

const warpWidth = 32;

function pixelToComplex(px, py, width, height, view) {
  const u = px / (width - 1);
  const v = py / (height - 1);

  return {
    cx: view.x_min + u * (view.x_max - view.x_min),
    cy: view.y_min + v * (view.y_max - view.y_min),
  };
}

function mandelbrotEscape(cx, cy, maxIter) {
  let zx = 0.0;
  let zy = 0.0;

  for (let iter = 0; iter < maxIter; iter++) {
    const newZx = zx * zx - zy * zy + cx;
    const newZy = 2 * zx * zy + cy;
    zx = newZx;
    zy = newZy;

    if (zx * zx + zy * zy > 4.0) {
      return iter + 1;
    }
  }

  return maxIter;
}

function drawMandelbrot() {
  const w = mandelCanvas.width;
  const h = mandelCanvas.height;
  const image = mandelCtx.createImageData(w, h);
  const data = image.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const { cx, cy } = pixelToComplex(px, py, w, h, view);
      const it = mandelbrotEscape(cx, cy, view.max_iter);
      const gray = Math.floor((it / view.max_iter) * 255);
      const idx = (py * w + px) * 4;

      data[idx + 0] = gray;
      data[idx + 1] = gray;
      data[idx + 2] = gray;
      data[idx + 3] = 255;
    }
  }

  mandelCtx.putImageData(image, 0, 0);
  mandelMeta.textContent =
    `view: [${view.x_min}, ${view.x_max}] x [${view.y_min}, ${view.y_max}] ` +
    `image: ${w} x ${h} max_iter: ${view.max_iter}`;
}

function drawWarpOverlay(startPx, py) {
  mandelCtx.save();
  mandelCtx.strokeStyle = "#ff4d4d";
  mandelCtx.lineWidth = 2;
  mandelCtx.strokeRect(startPx + 0.5, py + 0.5, warpWidth, 1);
  mandelCtx.restore();
}

function drawTrace(trace) {
  const steps = trace.steps;
  const rows = steps.length;
  const cols = trace.warp_width;

  traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);

  if (rows === 0) {
    traceMeta.textContent = "No active steps recorded.";
    return;
  }

  const cellW = traceCanvas.width / cols;
  const cellH = Math.max(2, traceCanvas.height / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const active = steps[r][c] === 1;
      traceCtx.fillStyle = active ? "#39d353" : "#1f2937";
      traceCtx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
    }
  }

  traceMeta.textContent =
    `warp_width: ${trace.warp_width} ` +
    `steps: ${rows} ` +
    `divergence_start_iter: ${trace.divergence_start_iter} ` +
    `utilization: ${(trace.utilization * 100).toFixed(2)}% ` +
    `lane_escape_iters: ${trace.lane_escape_iters.join(", ")} ` +
    `active_counts: ${trace.active_counts.join(", ")}`;
}

function drawMemoryTrace(trace) {
  memoryCtx.clearRect(0, 0, memoryCanvas.width, memoryCanvas.height);

  const lanes = trace.warp_width;
  const cellW = memoryCanvas.width / lanes;
  const cellH = 70;

  const colorMap = new Map();
  const palette = [
    "#2563eb", "#16a34a", "#dc2626", "#9333ea",
    "#ea580c", "#0891b2", "#ca8a04", "#4f46e5"
  ];

  function colorForSegment(seg) {
    if (seg < 0) return "#111827";
    if (!colorMap.has(seg)) {
      colorMap.set(seg, palette[colorMap.size % palette.length]);
    }
    return colorMap.get(seg);
  }

  // Row 1: lane index
  for (let lane = 0; lane < lanes; lane++) {
    memoryCtx.fillStyle = "#1f2937";
    memoryCtx.fillRect(lane * cellW, 0, cellW - 1, 40);
    memoryCtx.fillStyle = "#e5e7eb";
    memoryCtx.fillText(`${lane}`, lane * cellW + 6, 24);
  }

  // Row 2: segment colors
  for (let lane = 0; lane < lanes; lane++) {
    const active = trace.active_mask[lane] === 1;
    const seg = trace.lane_segments[lane];
    memoryCtx.fillStyle = active ? colorForSegment(seg) : "#111827";
    memoryCtx.fillRect(lane * cellW, 50, cellW - 1, cellH);

    memoryCtx.fillStyle = "#ffffff";
    if (active) {
      memoryCtx.fillText(`S${seg}`, lane * cellW + 4, 92);
    }
  }

  // Row 3: address labels
  for (let lane = 0; lane < lanes; lane++) {
    memoryCtx.fillStyle = "#0f172a";
    memoryCtx.fillRect(lane * cellW, 130, cellW - 1, cellH);

    memoryCtx.fillStyle = "#93c5fd";
    const addr = trace.lane_addresses[lane];
    if (addr >= 0) {
      memoryCtx.fillText(`${addr}`, lane * cellW + 2, 172);
    }
  }

  memoryMeta.textContent =
    `transactions: ${trace.num_transactions}
requested_bytes: ${trace.requested_bytes}
fetched_bytes: ${trace.fetched_bytes}
load_efficiency: ${(trace.load_efficiency * 100).toFixed(2)}%
rule: unique 32-byte segments touched by active warp lanes`;
}

function runMemoryLab() {
  const strideWords = Number(patternSelect.value);
  const baseAddress = Number(baseAddressInput.value);

  const trace = Module.simulateCoalescing({
    warp_width: 32,
    word_size: 4,
    base_address: baseAddress,
    stride_words: strideWords,
    active_mask: new Array(32).fill(1),
  });

  drawMemoryTrace(trace);
}

function clampStartPx(px, width) {
  return Math.max(0, Math.min(px, width - warpWidth));
}

mandelCanvas.addEventListener("click", (event) => {
  drawMandelbrot();

  const rect = mandelCanvas.getBoundingClientRect();
  const scaleX = mandelCanvas.width / rect.width;
  const scaleY = mandelCanvas.height / rect.height;

  const px = Math.floor((event.clientX - rect.left) * scaleX);
  const py = Math.floor((event.clientY - rect.top) * scaleY);
  const startPx = clampStartPx(px, mandelCanvas.width);

  const trace = Module.simulateWarp({
    image_width: mandelCanvas.width,
    image_height: mandelCanvas.height,
    start_px: startPx,
    py,
    warp_width: warpWidth,
    max_iter: view.max_iter,
    x_min: view.x_min,
    x_max: view.x_max,
    y_min: view.y_min,
    y_max: view.y_max,
  });

  drawWarpOverlay(startPx, py);
  drawTrace(trace);
});

patternSelect.addEventListener("change", runMemoryLab);
baseAddressInput.addEventListener("input", runMemoryLab);

drawMandelbrot();
runMemoryLab();