import ModuleFactory from "../wasm/warp_sim.js";

const Module = await ModuleFactory();

const mandelCanvas = document.getElementById("mandelCanvas");
const mandelCtx = mandelCanvas.getContext("2d");

const traceCanvas = document.getElementById("traceCanvas");
const traceCtx = traceCanvas.getContext("2d");

const mandelMeta = document.getElementById("mandelMeta");
const traceMeta = document.getElementById("traceMeta");

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

drawMandelbrot();