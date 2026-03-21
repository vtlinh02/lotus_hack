import { useCallback, useState, useEffect } from "react";

const EXPECTED = 317;

/** Pseudo-random biased below expected to simulate lost increments */
function raceResult(seed) {
  const r = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = r - Math.floor(r);
  return Math.floor(270 + frac * 40);
}

export function RaceConditionSim({ readonly = false, onChange }) {
  const [runCount, setRunCount] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [animating, setAnimating] = useState(false);

  const report = useCallback(() => {
    onChange?.({
      kind: "race-condition",
      lastRunResult: lastResult,
    });
  }, [onChange, lastResult]);

  useEffect(() => {
    report();
  }, [report]);

  const runRace = () => {
    if (readonly || animating) return;
    setAnimating(true);
    setTimeout(() => {
      const next = raceResult(runCount + Date.now());
      setLastResult(next);
      setRunCount((c) => c + 1);
      setAnimating(false);
    }, 900);
  };

  return (
    <div className="space-y-4 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>EXPECTED </span>
          <span className="text-base font-bold">{EXPECTED}</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>LAST_COUNT </span>
          <span
            className="text-base font-bold"
            style={{ color: lastResult === EXPECTED ? "var(--green)" : "#ff4444" }}
          >
            {lastResult ?? "—"}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>RUNS </span>
          <span className="text-base font-bold">{runCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-6">
        <div className="text-center">
          <p style={{ color: "var(--green-dim)" }}>THREAD_A</p>
          <div
            className="mt-2 h-16 w-16 rounded border-2 transition-all"
            style={{
              borderColor: animating ? "var(--green)" : "var(--border)",
              background: animating ? "rgba(0,255,65,0.1)" : "transparent",
            }}
          >
            <span className="flex h-full items-center justify-center font-mono text-lg">A</span>
          </div>
        </div>
        <div
          className="rounded px-4 py-3 font-mono font-bold"
          style={{
            border: "2px solid #ff4444",
            color: "#ff4444",
            minWidth: "120px",
            textAlign: "center",
          }}
        >
          totalBright++
          <p className="mt-1 text-[10px] font-normal" style={{ color: "var(--green-dim)" }}>
            shared memory
          </p>
        </div>
        <div className="text-center">
          <p style={{ color: "var(--green-dim)" }}>THREAD_B</p>
          <div
            className="mt-2 h-16 w-16 rounded border-2 transition-all"
            style={{
              borderColor: animating ? "var(--green)" : "var(--border)",
              background: animating ? "rgba(0,255,65,0.1)" : "transparent",
            }}
          >
            <span className="flex h-full items-center justify-center font-mono text-lg">B</span>
          </div>
        </div>
      </div>

      <p style={{ color: "#1a3d1e" }}>
        {
          " > two threads increment the same counter without synchronization — interleaved RMW — wrong totals"
        }
      </p>

      {!readonly && (
        <button
          type="button"
          onClick={runRace}
          disabled={animating}
          className="rounded px-4 py-2 font-bold tracking-widest"
          style={{
            border: "1px solid var(--green)",
            color: "var(--green)",
            opacity: animating ? 0.6 : 1,
          }}
        >
          {animating ? "[ RACING... ]" : "[ RUN AGAIN ]"}
        </button>
      )}
    </div>
  );
}
