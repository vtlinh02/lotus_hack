import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useWasm } from "../hooks/useWasm.js";

const WARP_WIDTH = 32;
const CANVAS_W = 640;
const CANVAS_H = 320;

/** Match wasm/warp_divergence.cpp defaults */
const VIEW = {
  x_min: -2.0,
  x_max: 1.0,
  y_min: -1.0,
  y_max: 1.0,
  max_iter: 128,
};

const BASE_STEP_MS = 400;
/** ms per lockstep row (lower = faster). 32x ~= full 128-step trace in ~1.5s */
const SPEED_FACTORS = { 0.5: 800, 1: 400, 2: 200, 4: 100, 8: 50, 16: 25, 32: 12 };
const CHART_H = 240;

/** Preset click targets (image px) for education */
const REGION_PRESETS = {
  boundary: { px: 420, py: 140 },
  inside: { px: 266, py: 159 },
  outside: { px: 8, py: 160 },
};

function clampStartPx(px, width) {
  return Math.max(0, Math.min(px, width - WARP_WIDTH));
}

function pixelToComplex(px, py, width, height, view) {
  const u = width > 1 ? px / (width - 1) : 0;
  const v = height > 1 ? py / (height - 1) : 0;
  return {
    cx: view.x_min + u * (view.x_max - view.x_min),
    cy: view.y_min + v * (view.y_max - view.y_min),
  };
}

function mandelbrotEscape(cx, cy, maxIter) {
  let zx = 0;
  let zy = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    const newZx = zx * zx - zy * zy + cx;
    const newZy = 2 * zx * zy + cy;
    zx = newZx;
    zy = newZy;
    if (zx * zx + zy * zy > 4) return iter + 1;
  }
  return maxIter;
}

function normalizeTrace(raw) {
  if (!raw || !raw.steps) return null;
  const steps = [];
  const n = raw.steps.length;
  for (let i = 0; i < n; i++) {
    const row = raw.steps[i];
    steps.push(row instanceof Uint8Array || row instanceof Int8Array ? Array.from(row) : [...row]);
  }
  return {
    warp_width: raw.warp_width,
    max_iter: raw.max_iter,
    start_px: raw.start_px,
    py: raw.py,
    divergence_start_iter: raw.divergence_start_iter,
    utilization: typeof raw.utilization === "number" ? raw.utilization : 0,
    pixel_x: raw.pixel_x ? Array.from(raw.pixel_x) : [],
    lane_escape_iters: raw.lane_escape_iters ? Array.from(raw.lane_escape_iters) : [],
    active_counts: raw.active_counts ? Array.from(raw.active_counts) : [],
    steps,
  };
}

function formatStep(n) {
  return String(n).padStart(3, "0");
}

/** Active lockstep rows for lane l from row 0 through throughInclusive */
function countSegmentsThrough(steps, laneId, throughInclusive) {
  if (!steps?.length) return 0;
  const lim = Math.min(throughInclusive, steps.length - 1);
  let n = 0;
  for (let r = 0; r <= lim; r++) {
    if (steps[r][laneId] === 1) n++;
  }
  return n;
}

function lastActiveRowForLane(steps, laneId) {
  if (!steps?.length) return -1;
  let last = -1;
  for (let r = 0; r < steps.length; r++) {
    if (steps[r][laneId] === 1) last = r;
  }
  return last;
}

export function MandelbrotWarpSim({
  initialRegion = "boundary",
  readonly = false,
  coherentWarp = false,
  onCoherentWarpConsumed,
  onChange,
}) {
  const mandelRef = useRef(null);
  const intervalRef = useRef(null);
  const didInitialPresetRef = useRef(false);
  const { module, error } = useWasm();

  const [warpTrace, setWarpTrace] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedKey, setSpeedKey] = useState(8);
  const [pulsing, setPulsing] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [meta, setMeta] = useState("// click fractal — 32 horizontal neighbors = one warp");

  const stepMs = SPEED_FACTORS[speedKey] ?? BASE_STEP_MS;

  const drawMandelbrot = useCallback(() => {
    const canvas = mandelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const image = ctx.createImageData(w, h);
    const data = image.data;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const { cx, cy } = pixelToComplex(px, py, w, h, VIEW);
        const it = mandelbrotEscape(cx, cy, VIEW.max_iter);
        const t = it / VIEW.max_iter;
        const idx = (py * w + px) * 4;
        if (it >= VIEW.max_iter) {
          data[idx] = 0;
          data[idx + 1] = 26;
          data[idx + 2] = 10;
          data[idx + 3] = 255;
        } else if (t < 0.15) {
          data[idx] = 3;
          data[idx + 1] = 15;
          data[idx + 2] = 4;
          data[idx + 3] = 255;
        } else {
          const g = Math.floor(40 + t * 215);
          data[idx] = 0;
          data[idx + 1] = g;
          data[idx + 2] = Math.floor(g * 0.25);
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }, []);

  const drawWarpHighlight = useCallback((startPx, py) => {
    const canvas = mandelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawMandelbrot();
    ctx.save();
    ctx.strokeStyle = "var(--green)";
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect(startPx + 0.5, py + 0.5, WARP_WIDTH, 1);
    ctx.fillStyle = "rgba(0,255,65,0.12)";
    ctx.fillRect(startPx, py, WARP_WIDTH, 1);
    ctx.restore();
  }, [drawMandelbrot]);

  /** Aggregate utilization from WASM — reported to StoryView for TARGET (skip when exploring after chapter clear) */
  const reportTraceToParent = useCallback(
    (trace, suppress) => {
      if (!onChange || suppress) return;
      if (!trace || !trace.active_counts?.length) {
        onChange({
          kind: "mandelbrot-warp",
          utilization: 25,
          activeLanes: 8,
          maskedCount: 24,
        });
        return;
      }
      const u = trace.utilization * 100;
      const last = trace.active_counts[trace.active_counts.length - 1] ?? 0;
      onChange({
        kind: "mandelbrot-warp",
        utilization: u,
        activeLanes: last,
        maskedCount: WARP_WIDTH - last,
      });
    },
    [onChange]
  );

  const runSimulate = useCallback(
    (startPx, py, { play = true, appendLog = true } = {}) => {
      if (!module) return;
      const canvas = mandelRef.current;
      if (!canvas) return;

      const start = clampStartPx(startPx, canvas.width);
      const row = Math.max(0, Math.min(py, canvas.height - 1));

      const raw = module.simulateWarp({
        image_width: canvas.width,
        image_height: canvas.height,
        start_px: start,
        py: row,
        warp_width: WARP_WIDTH,
        max_iter: VIEW.max_iter,
        x_min: VIEW.x_min,
        x_max: VIEW.x_max,
        y_min: VIEW.y_min,
        y_max: VIEW.y_max,
      });

      const trace = normalizeTrace(raw);
      if (!trace?.steps?.length) return;

      setWarpTrace(trace);
      setCurrentStep(0);
      drawWarpHighlight(start, row);

      const finalU = trace.utilization * 100;
      if (appendLog) {
        const lines = [
          `> warp @ row ${row} cols ${start}–${start + WARP_WIDTH - 1}`,
          `> divergence_start_iter: ${trace.divergence_start_iter}`,
          `> aggregate_util: ${finalU.toFixed(1)}%`,
        ];
        trace.lane_escape_iters.forEach((it, lane) => {
          if (it < VIEW.max_iter) {
            lines.push(`> lane ${String(lane).padStart(2, "0")} escaped @ iter ${String(it).padStart(3, "0")}`);
          }
        });
        setLogLines(lines.slice(0, 48));
      }

      reportTraceToParent(trace, readonly);
      if (play) {
        setIsPlaying(true);
      }
    },
    [module, readonly, drawWarpHighlight, reportTraceToParent]
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    drawMandelbrot();
  }, [drawMandelbrot]);

  useEffect(() => {
    if (!isPlaying || !warpTrace?.steps?.length) {
      stopInterval();
      return;
    }

    intervalRef.current = setInterval(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 120);
      setCurrentStep((s) => {
        const max = warpTrace.steps.length - 1;
        if (s >= max) {
          stopInterval();
          setIsPlaying(false);
          return max;
        }
        const next = s + 1;
        return next;
      });
    }, stepMs);

    return () => stopInterval();
  }, [isPlaying, warpTrace, stepMs, stopInterval]);

  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  /** Chapter cleared: stop animation; user can still click Mandelbrot to explore locally */
  useEffect(() => {
    if (readonly) {
      stopInterval();
      setIsPlaying(false);
    }
  }, [readonly, stopInterval]);

  /** MCQ “coherent warps” — auto-run high-coherence warp */
  useEffect(() => {
    if (!coherentWarp || !module || readonly) return;
    const { px, py } = REGION_PRESETS.inside;
    runSimulate(clampStartPx(px, CANVAS_W), py, { play: true, appendLog: true });
    setMeta("// coherent warp preset — interior region (similar work per lane)");
    onCoherentWarpConsumed?.();
  }, [coherentWarp, module, readonly, runSimulate, onCoherentWarpConsumed]);

  /** First paint: demo warp for initialRegion (chapter briefing) */
  useEffect(() => {
    if (!module || readonly || didInitialPresetRef.current) return;
    didInitialPresetRef.current = true;
    const key = initialRegion in REGION_PRESETS ? initialRegion : "boundary";
    const p = REGION_PRESETS[key];
    runSimulate(p.px, p.py, { play: true, appendLog: true });
    setMeta(`// auto: ${key} region — click elsewhere to compare`);
  }, [module, readonly, initialRegion, runSimulate]);

  const handleCanvasClick = useCallback(
    (event) => {
      if (!module) {
        setMeta("// WASM loading… try again in a moment");
        return;
      }
      const canvas = mandelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = Math.floor((event.clientX - rect.left) * scaleX);
      const py = Math.floor((event.clientY - rect.top) * scaleY);
      setMeta(
        readonly
          ? `// explore mode — (${px}, ${py}) → warp ${clampStartPx(px, canvas.width)} (target frozen)`
          : `// selected image (${px}, ${py}) → warp start ${clampStartPx(px, canvas.width)}`
      );
      runSimulate(px, py);
    },
    [module, readonly, runSimulate]
  );

  const applyPreset = useCallback(
    (key) => {
      if (!module) return;
      const p = REGION_PRESETS[key];
      if (!p) return;
      setMeta(
        readonly ? `// explore — preset: ${key} (target frozen)` : `// preset: ${key}`
      );
      runSimulate(p.px, p.py);
    },
    [module, readonly, runSimulate]
  );

  const handlePlayPause = useCallback(() => {
    if (!warpTrace?.steps?.length) return;
    setIsPlaying((p) => !p);
  }, [warpTrace]);

  const handleResetAnim = useCallback(() => {
    stopInterval();
    setIsPlaying(false);
    setCurrentStep(0);
  }, [stopInterval]);

  const handleReplay = useCallback(() => {
    if (!warpTrace?.steps?.length) return;
    stopInterval();
    setCurrentStep(0);
    setIsPlaying(true);
  }, [warpTrace, stopInterval]);

  const handleSkipToEnd = useCallback(() => {
    if (!warpTrace?.steps?.length) return;
    stopInterval();
    setIsPlaying(false);
    setCurrentStep(warpTrace.steps.length - 1);
  }, [warpTrace, stopInterval]);

  const chartSteps = warpTrace?.steps;
  const chartRows = chartSteps?.length ?? 0;

  const laneChartMeta = useMemo(() => {
    if (!chartSteps?.length) {
      return { lastActive: [] };
    }
    const lastActive = [];
    for (let l = 0; l < WARP_WIDTH; l++) {
      lastActive.push(lastActiveRowForLane(chartSteps, l));
    }
    return { lastActive };
  }, [chartSteps]);

  if (error) {
    return (
      <p className="text-xs" style={{ color: "var(--red-error)" }}>
        Failed to load WASM: {error?.message ?? String(error)}
      </p>
    );
  }

  const trace = warpTrace;
  const totalSteps = trace?.steps?.length ?? 0;
  const activeNow =
    totalSteps > 0 && trace.active_counts
      ? trace.active_counts[Math.min(currentStep, totalSteps - 1)] ?? 0
      : 0;
  const liveUtil = trace ? (activeNow / WARP_WIDTH) * 100 : 25;
  const aggUtil = trace ? trace.utilization * 100 : 0;

  return (
    <div className="space-y-4 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>WARP_STEP </span>
          <span className="glow-text text-base font-bold">{formatStep(currentStep)}</span>
          <span style={{ color: "var(--green-dim)" }}> / {formatStep(Math.max(0, totalSteps - 1))}</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>ACTIVE_LANES </span>
          <span
            className="text-base font-bold"
            style={{
              color: liveUtil < 50 ? "var(--red-error)" : "var(--green)",
              textShadow:
                liveUtil < 50 ? "0 0 8px var(--red-error)" : "0 0 8px var(--green)",
            }}
          >
            {activeNow}/{WARP_WIDTH}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>STEP_UTIL </span>
          <span className="text-base font-bold" style={{ color: "var(--green)" }}>
            {liveUtil.toFixed(0)}%
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>AGG_UTIL </span>
          <span className="text-base font-bold" style={{ color: "var(--green-dim)" }}>
            {aggUtil.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="mb-1" style={{ color: "var(--green-dim)" }}>
            {"// MANDELBROT — click to trace one warp (32 neighbors)"}
          </p>
          <canvas
            ref={mandelRef}
            width={CANVAS_W}
            height={CANVAS_H}
            role="img"
            aria-label="Mandelbrot set, click to select warp"
            onClick={handleCanvasClick}
            className="mandelbrot-canvas max-w-full cursor-crosshair [image-rendering:pixelated]"
            style={{
              border: "1px solid var(--green-dim)",
              boxShadow:
                "0 0 16px var(--green-glow), inset 0 0 40px color-mix(in srgb, var(--bg) 55%, black)",
              background: "var(--bg)",
            }}
          />
          <pre
            className="mt-2 whitespace-pre-wrap font-mono text-[10px]"
            style={{ color: "var(--gray-subtle)" }}
          >
            {meta}
          </pre>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="mb-1" style={{ color: "var(--green-dim)" }}>
            {
              "// WARP SKYLINE — bars grow with lockstep; short = escaped early (idle waiting)"
            }
          </p>
          <div
            className="rounded p-2"
            style={{
              border: "1px solid var(--border)",
              background: "var(--chart-well)",
            }}
          >
            <div
              className="relative flex w-full items-end gap-px sm:gap-0.5"
              style={{ height: CHART_H }}
              role="img"
              aria-label="Warp lane columns, height shows active lockstep steps so far"
            >
              {/* faint horizontal guides */}
              <div
                className="pointer-events-none absolute inset-0 flex flex-col justify-between py-0.5"
                aria-hidden
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full border-t"
                        style={{
                          borderColor: "color-mix(in srgb, var(--gray-subtle) 35%, transparent)",
                        }}
                  />
                ))}
              </div>
              {Array.from({ length: WARP_WIDTH }, (_, laneId) => {
                const steps = chartSteps;
                const esc = trace?.lane_escape_iters?.[laneId];
                const denom = Math.max(1, chartRows);
                const segs = steps?.length
                  ? countSegmentsThrough(steps, laneId, currentStep)
                  : 0;
                const pct = (segs / denom) * 100;
                const lastR = laneChartMeta.lastActive[laneId] ?? -1;
                const growingNow =
                  steps?.length &&
                  currentStep >= 0 &&
                  currentStep < steps.length &&
                  steps[currentStep]?.[laneId] === 1;
                const doneGrowing = lastR >= 0 && currentStep > lastR;
                const pulseTop = growingNow && pulsing && isPlaying;
                const frozen = doneGrowing;
                const title =
                  esc != null
                    ? `Lane ${laneId} — escaped @ iter ${esc}${frozen ? " (idle)" : ""}`
                    : `Lane ${laneId}`;
                return (
                  <div
                    key={laneId}
                    className="relative z-[1] flex min-w-0 flex-1 flex-col items-stretch justify-end"
                    style={{ height: CHART_H }}
                    title={title}
                  >
                    <div
                      className="flex w-full flex-col justify-end"
                      style={{ height: CHART_H - 14, minHeight: 0 }}
                    >
                      <div
                        className="w-full rounded-t transition-[height] duration-150 ease-out"
                        style={{
                          height: `${pct}%`,
                          minHeight: segs > 0 ? 2 : 0,
                          background: frozen
                            ? "linear-gradient(180deg, #003310 0%, #0d0000 100%)"
                            : pulseTop
                              ? "#00ff41"
                              : growingNow
                                ? "linear-gradient(180deg, #00ff41 0%, #004d1a 100%)"
                                : "#001a00",
                          border:
                            segs > 0
                              ? frozen
                                ? "1px solid #2a0000"
                                : pulseTop
                                  ? "1px solid #00ff41"
                                  : "1px solid var(--gray-subtle)"
                              : "1px solid transparent",
                          boxShadow: pulseTop ? "0 0 12px #00ff41, 0 -2px 8px #00ff4188" : "none",
                        }}
                      />
                    </div>
                    <span
                      className="mt-0.5 text-center font-mono text-[6px] leading-none sm:text-[7px]"
                      style={{ color: "var(--gray-subtle)" }}
                    >
                      {String(laneId).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!trace}
              className="rounded px-3 py-1.5 font-bold tracking-widest transition-all disabled:opacity-40"
              style={{
                border: "1px solid var(--green)",
                background: isPlaying ? "var(--green)" : "transparent",
                color: isPlaying ? "var(--bg)" : "var(--green)",
              }}
            >
              {isPlaying ? "[ PAUSE ]" : "[ PLAY ]"}
            </button>
            <button
              type="button"
              onClick={handleReplay}
              disabled={!trace}
              className="rounded px-3 py-1.5 font-bold tracking-widest"
              style={{
                border: "1px solid var(--green-dim)",
                color: "var(--green-dim)",
              }}
            >
              [ REPLAY ]
            </button>
            <button
              type="button"
              onClick={handleResetAnim}
              disabled={!trace}
              className="rounded px-3 py-1.5 font-bold tracking-widest"
              style={{
                border: "1px solid var(--green-dim)",
                color: "var(--green-dim)",
              }}
            >
              [ STEP 0 ]
            </button>
            <button
              type="button"
              onClick={handleSkipToEnd}
              disabled={!trace}
              className="rounded px-3 py-1.5 font-bold tracking-widest"
              style={{
                border: "1px solid var(--green-dim)",
                color: "var(--green)",
              }}
              title="Jump to final lockstep frame"
            >
              [ SKIP → END ]
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span style={{ color: "var(--green-dim)" }}>{"// speed "}</span>
            {[0.5, 1, 2, 4, 8, 16, 32].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSpeedKey(k)}
                className="rounded px-2 py-1 font-mono text-[10px] font-bold"
                style={{
                  border: `1px solid ${speedKey === k ? "var(--green)" : "var(--border)"}`,
                  color: speedKey === k ? "var(--green)" : "var(--green-dim)",
                  background: speedKey === k ? "rgba(0,255,65,0.08)" : "transparent",
                }}
              >
                [{k}x]
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span style={{ color: "var(--green-dim)" }}>{"// presets "}</span>
            {["boundary", "inside", "outside"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => applyPreset(k)}
                disabled={!module}
                className="rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                style={{
                  border: "1px solid var(--gray-subtle)",
                  color: "var(--green-dim)",
                }}
              >
                [{k}]
              </button>
            ))}
          </div>

          <div
            className="trace-log-panel max-h-32 overflow-y-auto rounded p-2 font-mono text-[10px] leading-relaxed"
            style={{
              border: "1px solid var(--border)",
              color: "var(--gray-dim)",
              background: "var(--trace-log-bg)",
            }}
          >
            {logLines.length === 0 ? (
              <span style={{ color: "var(--gray-subtle)" }}>{"> trace log…"}</span>
            ) : (
              logLines.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
