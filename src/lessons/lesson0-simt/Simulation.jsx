import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_LANES = 32;
const STEP_MS = 600;

function formatStep(n) {
  return String(n).padStart(4, "0");
}

export function Simulation() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [maskedCount, setMaskedCount] = useState(0);
  // maskedLanes: Set of lane indices that are disabled
  const [maskedLanes, setMaskedLanes] = useState(new Set());
  // pulsing: true during the "fire" flash
  const [pulsing, setPulsing] = useState(false);

  const intervalRef = useRef(null);

  const activeLanes = TOTAL_LANES - maskedLanes.size;
  const utilization = activeLanes === 0 ? 0 : (activeLanes / TOTAL_LANES) * 100;

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 200);
      setStep((s) => s + 1);
    }, STEP_MS);

    return () => clearInterval(intervalRef.current);
  }, [running]);

  // ── Divergence slider ────────────────────────────────────────────────────
  const handleDivergence = useCallback((e) => {
    const count = Number(e.target.value);
    setMaskedCount(count);

    // Deterministically pick lanes to mask (first N lanes for reproducibility)
    const next = new Set();
    for (let i = 0; i < count; i++) next.add(i);
    setMaskedLanes(next);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setStep(0);
    setMaskedCount(0);
    setMaskedLanes(new Set());
    setPulsing(false);
  }, []);

  // ── Derived display values ───────────────────────────────────────────────
  const wastedSlots = maskedLanes.size;
  const allDead = activeLanes === 0;

  return (
    <div className="space-y-5 text-xs tracking-wide" style={{ color: "var(--green)" }}>

      {/* Context banner */}
      <div
        className="rounded p-3 text-xs leading-relaxed"
        style={{ border: "1px solid #1a5c20", background: "rgba(0,255,65,0.03)", color: "var(--green-dim)" }}
      >
        <span style={{ color: "var(--green)" }}>// WHAT YOU ARE SEEING: </span>
        These 32 lanes are one warp — 32 threads executing the same instruction in lockstep. Click
        RUN to watch them fire together every step. Drag the slider to simulate threads that
        finished early (e.g. in a game: some pixels hit the sky in 3 bounces, others keep bouncing
        through geometry). The masked lanes sit idle and waste GPU cycles — that is warp divergence.
      </div>

      {/* Header stats */}
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>WARP_STEP </span>
          <span className="glow-text text-base font-bold">{formatStep(step)}</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>UTILIZATION </span>
          <span
            className={`text-base font-bold ${allDead ? "text-red-500" : ""}`}
            style={allDead ? {} : { color: "var(--green)", textShadow: "0 0 8px var(--green)" }}
          >
            {allDead ? "0% — ALL LANES DEAD" : `${utilization.toFixed(0)}%`}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>WASTED_SLOTS </span>
          <span
            className="text-base font-bold"
            style={{ color: wastedSlots > 0 ? "#ff4444" : "var(--green-dim)" }}
          >
            {wastedSlots}
          </span>
        </div>
      </div>

      {/* Lane grid */}
      <div>
        <p className="mb-2 text-xs" style={{ color: "var(--green-dim)" }}>
          // 32 lanes — one warp
        </p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: TOTAL_LANES }, (_, i) => {
            const masked = maskedLanes.has(i);
            const active = !masked && pulsing && running;
            const idle = !masked && !pulsing && running;

            return (
              <div
                key={i}
                title={`Lane ${i}${masked ? " [MASKED]" : ""}`}
                className="flex h-9 w-9 flex-col items-center justify-center rounded text-[9px] font-bold transition-all duration-100"
                style={{
                  border: masked
                    ? "1px solid #2a0000"
                    : active
                    ? "1px solid #00ff41"
                    : "1px solid #1a3d1e",
                  background: masked
                    ? "#0d0000"
                    : active
                    ? "#00ff41"
                    : idle
                    ? "#001a00"
                    : "#030f04",
                  color: masked ? "#330000" : active ? "#020a03" : "var(--green-dim)",
                  boxShadow: active ? "0 0 8px #00ff41" : "none",
                }}
              >
                <span>{masked ? "XX" : `L${i}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divergence slider */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span style={{ color: "var(--green-dim)" }}>
            INJECT DIVERGENCE — masked lanes:{" "}
            <strong style={{ color: maskedCount > 0 ? "#ff4444" : "var(--green)" }}>
              {maskedCount}
            </strong>
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={TOTAL_LANES}
          value={maskedCount}
          onChange={handleDivergence}
          className="w-full accent-[#00ff41]"
          style={{ accentColor: "var(--green)" }}
        />
        <div className="flex justify-between text-xs" style={{ color: "#1a3d1e" }}>
          <span>0 (100% util)</span>
          <span>16 (50% util)</span>
          <span>32 (0% util)</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded px-5 py-2 font-bold tracking-widest transition-all"
          style={{
            border: "1px solid var(--green)",
            background: running ? "var(--green)" : "transparent",
            color: running ? "var(--bg)" : "var(--green)",
          }}
          onMouseEnter={(e) => {
            if (!running) {
              e.currentTarget.style.background = "#001a00";
            }
          }}
          onMouseLeave={(e) => {
            if (!running) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          {running ? "[ PAUSE ]" : "[ RUN LOCKSTEP ]"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded px-5 py-2 font-bold tracking-widest transition-all"
          style={{
            border: "1px solid var(--green-dim)",
            background: "transparent",
            color: "var(--green-dim)",
          }}
        >
          [ RESET ]
        </button>
      </div>

      {/* Contextual hint */}
      <div
        className="rounded p-3 text-xs leading-relaxed"
        style={{ background: "#030f04", border: "1px solid var(--border)", color: "var(--green-dim)" }}
      >
        {maskedCount === 0 && (
          <p>
            // All 32 lanes fire every step — this is{" "}
            <strong style={{ color: "var(--green)" }}>perfect SIMT</strong>. Drag the slider to mask
            lanes and simulate early exits.
          </p>
        )}
        {maskedCount > 0 && maskedCount < TOTAL_LANES && (
          <p>
            // {maskedCount} lane{maskedCount > 1 ? "s" : ""} finished early. The warp still runs
            for the survivors — those {maskedCount} slots are{" "}
            <strong style={{ color: "#ff4444" }}>wasted</strong> every step. This is{" "}
            <strong style={{ color: "var(--green)" }}>warp divergence</strong>. Next lesson shows
            exactly this with the Mandelbrot set.
          </p>
        )}
        {allDead && (
          <p style={{ color: "#ff4444" }}>
            // All lanes masked — the warp produces zero useful work. 100% overhead.
          </p>
        )}
      </div>

      {/* Try this guide */}
      <div
        className="rounded p-4 space-y-2 text-xs leading-relaxed"
        style={{ border: "1px solid #1a5c20", background: "rgba(0,255,65,0.03)" }}
      >
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>// TRY THIS</p>
        <ol className="space-y-1 list-none" style={{ color: "var(--green-dim)" }}>
          <li>
            <span style={{ color: "var(--green)" }}>1.</span> Leave the slider at 0, click{" "}
            <strong>RUN LOCKSTEP</strong> — all 32 lanes fire every step, 100% utilization. Perfect SIMT.
          </li>
          <li>
            <span style={{ color: "var(--green)" }}>2.</span> Set the slider to <strong>16</strong> —
            half the warp is masked. Run again. Utilization drops to 50%. Those 16 lanes waste
            cycles every step.
          </li>
          <li>
            <span style={{ color: "var(--green)" }}>3.</span> Set the slider to <strong>32</strong> —
            all lanes dead. The warp produces zero useful work. 100% overhead.
          </li>
        </ol>
      </div>
    </div>
  );
}
