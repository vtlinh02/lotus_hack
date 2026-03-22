import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_LANES = 32;
const STEP_MS = 600;

function formatStep(n) {
  return String(n).padStart(4, "0");
}

export function WarpSimulation({ initialMasked = 0, readonly = false, onChange }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [maskedCount, setMaskedCount] = useState(initialMasked);
  const [maskedLanes, setMaskedLanes] = useState(() => {
    const next = new Set();
    for (let i = 0; i < initialMasked; i++) next.add(i);
    return next;
  });
  const [pulsing, setPulsing] = useState(false);
  const intervalRef = useRef(null);

  const activeLanes = TOTAL_LANES - maskedLanes.size;
  const utilization = activeLanes === 0 ? 0 : (activeLanes / TOTAL_LANES) * 100;
  const wastedSlots = maskedLanes.size;
  const allDead = activeLanes === 0;

  const reportState = useCallback(() => {
    if (onChange) {
      onChange({
        maskedCount: maskedLanes.size,
        activeLanes: TOTAL_LANES - maskedLanes.size,
        utilization: (TOTAL_LANES - maskedLanes.size) / TOTAL_LANES * 100,
      });
    }
  }, [onChange, maskedLanes.size]);

  useEffect(() => {
    reportState();
  }, [reportState]);

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

  const handleDivergence = useCallback(
    (e) => {
      if (readonly) return;
      const count = Number(e.target.value);
      setMaskedCount(count);
      const next = new Set();
      for (let i = 0; i < count; i++) next.add(i);
      setMaskedLanes(next);
    },
    [readonly]
  );

  const handleReset = useCallback(() => {
    if (readonly) return;
    setRunning(false);
    setStep(0);
    setMaskedCount(initialMasked);
    const next = new Set();
    for (let i = 0; i < initialMasked; i++) next.add(i);
    setMaskedLanes(next);
    setPulsing(false);
  }, [readonly, initialMasked]);

  useEffect(() => {
    const next = new Set();
    for (let i = 0; i < initialMasked; i++) next.add(i);
    setMaskedLanes(next);
    setMaskedCount(initialMasked);
  }, [initialMasked]);

  return (
    <div className="space-y-5 text-xs tracking-wide" style={{ color: "var(--green)" }}>
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
            style={
              allDead ? {} : { color: "var(--green)", textShadow: "0 0 8px var(--green)" }
            }
          >
            {allDead ? "0% — ALL LANES DEAD" : `${utilization.toFixed(0)}%`}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>WASTED_SLOTS </span>
          <span
            className="text-base font-bold"
            style={{ color: wastedSlots > 0 ? "var(--red-error)" : "var(--green-dim)" }}
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
                    ? "1px solid color-mix(in srgb, var(--red-error) 55%, #000)"
                    : active
                      ? "1px solid var(--green)"
                      : "1px solid var(--gray-subtle)",
                  background: masked
                    ? "color-mix(in srgb, var(--red-bg) 88%, var(--red-error))"
                    : active
                      ? "var(--green)"
                      : idle
                        ? "var(--lane-idle)"
                        : "var(--lane-off)",
                  color: masked ? "var(--red-error)" : active ? "var(--bg)" : "var(--green-dim)",
                  boxShadow: active ? "0 0 8px var(--green)" : "none",
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
            <strong style={{ color: maskedCount > 0 ? "var(--red-error)" : "var(--green)" }}>
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
          disabled={readonly}
          className="w-full accent-[#00ff41] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ accentColor: "var(--green)" }}
        />
        <div className="flex justify-between text-xs" style={{ color: "var(--gray-subtle)" }}>
          <span>0 (100% util)</span>
          <span>16 (50% util)</span>
          <span>32 (0% util)</span>
        </div>
      </div>

      {/* Controls */}
      {!readonly && (
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
              if (!running) e.currentTarget.style.background = "#001a00";
            }}
            onMouseLeave={(e) => {
              if (!running) e.currentTarget.style.background = "transparent";
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
      )}
    </div>
  );
}
