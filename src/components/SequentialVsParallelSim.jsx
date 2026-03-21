import { useEffect, useCallback, useState, useRef } from "react";

const PIXELS = 32;

/** Estimated time for 1024 pixels: 1024ms sequential, split across workers */
function timeForWorkers(workers) {
  const w = Math.max(1, Math.min(workers, 1024));
  return Math.ceil(1024 / w);
}

export function SequentialVsParallelSim({
  parallelWorkers = 1,
  readonly = false,
  onChange,
}) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const processingTimeMs = timeForWorkers(parallelWorkers);

  const report = useCallback(() => {
    onChange?.({
      kind: "sequential-vs-parallel",
      processingTimeMs,
      parallelWorkers,
    });
  }, [onChange, processingTimeMs, parallelWorkers]);

  useEffect(() => {
    report();
  }, [report]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const runScan = () => {
    if (readonly || running) return;
    setProgress(0);
    setRunning(true);
    const batch = Math.max(1, Math.min(parallelWorkers, PIXELS));
    let p = 0;
    intervalRef.current = setInterval(() => {
      p = Math.min(PIXELS, p + batch);
      setProgress(p);
      if (p >= PIXELS) {
        clearInterval(intervalRef.current);
        setRunning(false);
      }
    }, 60);
  };

  return (
    <div className="space-y-4 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>PIXELS </span>
          <span className="text-base font-bold">1024</span>
          <span className="ml-2" style={{ color: "#1a3d1e" }}>
            (showing 32)
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>WORKERS </span>
          <span className="text-base font-bold">{parallelWorkers}</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>EST_TIME </span>
          <span
            className="text-base font-bold"
            style={{ color: processingTimeMs <= 200 ? "var(--green)" : "#ff4444" }}
          >
            {processingTimeMs}ms
          </span>
        </div>
      </div>

      <p style={{ color: "var(--green-dim)" }}>
        {"// 32 of 1024 pixels — green = processed"}
      </p>
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: PIXELS }, (_, i) => {
          const done = i < progress;
          return (
            <div
              key={i}
              className="h-5 w-5 rounded-sm text-[8px]"
              style={{
                border: "1px solid #1a3d1e",
                background: done ? "var(--green)" : "#0d150d",
                color: done ? "var(--bg)" : "#1a3d1e",
              }}
            />
          );
        })}
      </div>

      <p style={{ color: "#1a3d1e" }}>
        {parallelWorkers === 1
          ? " > sequential: one pixel at a time — 1024ms for full frame"
          : ` > ${parallelWorkers} workers in parallel — ~${processingTimeMs}ms (idealized)`}
      </p>

      {!readonly && (
        <button
          type="button"
          onClick={runScan}
          disabled={running}
          className="rounded px-4 py-2 font-bold tracking-widest"
          style={{
            border: "1px solid var(--green)",
            background: running ? "#001a00" : "transparent",
            color: "var(--green)",
            opacity: running ? 0.6 : 1,
          }}
        >
          {running ? "[ SCANNING... ]" : "[ RUN SCAN ]"}
        </button>
      )}
    </div>
  );
}
