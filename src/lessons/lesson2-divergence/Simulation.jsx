import { useRef, useEffect, useCallback, useState } from "react";
import { useWasm } from "../../hooks/useWasm.js";

const WARP_WIDTH = 32;
const DEFAULT_SPEED_MS = 50;

const VIEW = {
  x_min: -2.0,
  x_max: 1.0,
  y_min: -1.0,
  y_max: 1.0,
  max_iter: 128,
};

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
    if (zx * zx + zy * zy > 4.0) return iter + 1;
  }
  return maxIter;
}

function clampStartPx(px, width) {
  return Math.max(0, Math.min(px, width - WARP_WIDTH));
}

function formatTraceMeta(trace, visibleRows, animating) {
  const rows = trace.steps.length;
  const duringAnimation =
    animating &&
    visibleRows < rows;

  if (rows === 0) return "No active steps recorded.";

  if (duringAnimation) {
    return (
      `warp_width: ${trace.warp_width}  step: ${visibleRows} / ${rows}  (animating...)\n` +
      `divergence_start_iter: ${trace.divergence_start_iter}  utilization: ${(trace.utilization * 100).toFixed(2)}%`
    );
  }

  return (
    `warp_width: ${trace.warp_width}  steps: ${rows}  divergence_start_iter: ${trace.divergence_start_iter}  utilization: ${(trace.utilization * 100).toFixed(2)}%\n` +
    `lane_escape_iters: ${trace.lane_escape_iters.join(", ")}\n` +
    `active_counts: ${trace.active_counts.join(", ")}`
  );
}

export function Simulation() {
  const mandelCanvasRef = useRef(null);
  const traceCanvasRef = useRef(null);
  const intervalRef = useRef(null);

  const { module, error } = useWasm();
  const [mandelMeta, setMandelMeta] = useState("");
  const [traceMeta, setTraceMeta] = useState(
    "Click the Mandelbrot image to trace one 32-pixel warp on that row."
  );
  const [trace, setTrace] = useState(null);
  const [visibleRows, setVisibleRows] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS);

  const drawMandelbrot = useCallback(() => {
    const mandelCanvas = mandelCanvasRef.current;
    if (!mandelCanvas) return;
    const mandelCtx = mandelCanvas.getContext("2d");
    const w = mandelCanvas.width;
    const h = mandelCanvas.height;
    const image = mandelCtx.createImageData(w, h);
    const data = image.data;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const { cx, cy } = pixelToComplex(px, py, w, h, VIEW);
        const it = mandelbrotEscape(cx, cy, VIEW.max_iter);
        const gray = Math.floor((it / VIEW.max_iter) * 255);
        const idx = (py * w + px) * 4;
        data[idx + 0] = gray;
        data[idx + 1] = gray;
        data[idx + 2] = gray;
        data[idx + 3] = 255;
      }
    }

    mandelCtx.putImageData(image, 0, 0);
    setMandelMeta(
      `view: [${VIEW.x_min}, ${VIEW.x_max}] × [${VIEW.y_min}, ${VIEW.y_max}]  image: ${w}×${h}  max_iter: ${VIEW.max_iter}`
    );
  }, []);

  const drawWarpOverlay = useCallback((mandelCtx, startPx, py) => {
    mandelCtx.save();
    mandelCtx.strokeStyle = "#ff4d4d";
    mandelCtx.lineWidth = 2;
    mandelCtx.strokeRect(startPx + 0.5, py + 0.5, WARP_WIDTH, 1);
    mandelCtx.restore();
  }, []);

  const drawTrace = useCallback((traceCtx, traceCanvas, traceData, maxRow) => {
    const steps = traceData.steps;
    const rows = steps.length;
    const cols = traceData.warp_width;

    traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);

    if (rows === 0) return;

    const cellW = traceCanvas.width / cols;
    const cellH = Math.max(2, traceCanvas.height / rows);
    const toDraw = Math.min(maxRow, rows);

    for (let r = 0; r < toDraw; r++) {
      for (let c = 0; c < cols; c++) {
        const active = steps[r][c] === 1;
        traceCtx.fillStyle = active ? "#39d353" : "#1f2937";
        traceCtx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
      }
    }
  }, []);

  // Redraw trace when trace or visibleRows change
  useEffect(() => {
    if (!trace || !traceCanvasRef.current) return;
    const traceCtx = traceCanvasRef.current.getContext("2d");
    drawTrace(traceCtx, traceCanvasRef.current, trace, visibleRows);
    setTraceMeta(formatTraceMeta(trace, visibleRows, animating));
  }, [trace, visibleRows, animating, drawTrace]);

  const startAnimation = useCallback(
    (t, fromRow = 0) => {
      const total = t.steps.length;
      if (total === 0) {
        setVisibleRows(0);
        setAnimating(false);
        return;
      }

      if (intervalRef.current) clearInterval(intervalRef.current);

      setVisibleRows(fromRow);
      setAnimating(true);

      intervalRef.current = setInterval(() => {
        setVisibleRows((prev) => {
          if (prev >= total - 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setAnimating(false);
            return total;
          }
          return prev + 1;
        });
      }, speedMs);
    },
    [speedMs]
  );

  const handlePause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAnimating(false);
  }, []);

  const handleReplay = useCallback(() => {
    if (!trace) return;
    startAnimation(trace, 0);
  }, [trace, startAnimation]);

  const handlePlay = useCallback(() => {
    if (!trace) return;
    const total = trace.steps.length;
    const finished = visibleRows >= total;
    startAnimation(trace, finished ? 0 : visibleRows);
  }, [trace, visibleRows, startAnimation]);

  useEffect(() => {
    drawMandelbrot();
  }, [drawMandelbrot]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mandelCanvas = mandelCanvasRef.current;
    const traceCanvas = traceCanvasRef.current;
    if (!mandelCanvas || !traceCanvas) return;

    const onClick = (event) => {
      drawMandelbrot();
      const mandelCtx = mandelCanvas.getContext("2d");
      const rect = mandelCanvas.getBoundingClientRect();
      const scaleX = mandelCanvas.width / rect.width;
      const scaleY = mandelCanvas.height / rect.height;
      const px = Math.floor((event.clientX - rect.left) * scaleX);
      const py = Math.floor((event.clientY - rect.top) * scaleY);
      const startPx = clampStartPx(px, mandelCanvas.width);

      if (!module) {
        setTraceMeta("WASM module still loading — wait a moment and click again.");
        return;
      }

      const newTrace = module.simulateWarp({
        image_width: mandelCanvas.width,
        image_height: mandelCanvas.height,
        start_px: startPx,
        py,
        warp_width: WARP_WIDTH,
        max_iter: VIEW.max_iter,
        x_min: VIEW.x_min,
        x_max: VIEW.x_max,
        y_min: VIEW.y_min,
        y_max: VIEW.y_max,
      });

      drawWarpOverlay(mandelCtx, startPx, py);

      setTrace(newTrace);
      startAnimation(newTrace, 0);
    };

    mandelCanvas.addEventListener("click", onClick);
    return () => mandelCanvas.removeEventListener("click", onClick);
  }, [module, drawMandelbrot, drawWarpOverlay, startAnimation]);

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load WASM: {error?.message ?? String(error)}
      </p>
    );
  }

  const totalRows = trace?.steps?.length ?? 0;
  const canControl = trace && totalRows > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs text-slate-500">Mandelbrot — click to select a warp</p>
        <canvas
          ref={mandelCanvasRef}
          id="mandelCanvas"
          width={640}
          height={480}
          className="w-full max-w-[640px] border border-slate-600 bg-black [image-rendering:pixelated]"
        />
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-400">
          {mandelMeta}
        </pre>
      </div>
      <div className="flex flex-col gap-3">
        <p className="mb-2 text-xs text-slate-500">
          Columns = lanes 0–31, rows = iterations (green = active)
        </p>
        <canvas
          ref={traceCanvasRef}
          id="traceCanvas"
          width={640}
          height={480}
          className="w-full max-w-[640px] border border-slate-600 bg-black [image-rendering:pixelated]"
        />

        {canControl && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={animating ? handlePause : handlePlay}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              {animating ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={handleReplay}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              Replay
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Speed:
              <select
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
                disabled={animating}
              >
                <option value={25}>Fast (25ms/row)</option>
                <option value={50}>Normal (50ms/row)</option>
                <option value={100}>Slow (100ms/row)</option>
              </select>
            </label>
          </div>
        )}

        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-400">{traceMeta}</pre>
      </div>
    </div>
  );
}
