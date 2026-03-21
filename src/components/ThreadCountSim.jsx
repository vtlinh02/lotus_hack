import { useEffect, useCallback, useState, useMemo } from "react";

const BASE_MS = 1024;
const OPTIONS = [1, 2, 4, 8, 16, 32];

export function ThreadCountSim({
  maxThreadCount = 32,
  readonly = false,
  onChange,
}) {
  const available = useMemo(
    () => OPTIONS.filter((n) => n <= maxThreadCount),
    [maxThreadCount]
  );

  const [threadCount, setThreadCount] = useState(() => available[available.length - 1] ?? 1);

  useEffect(() => {
    if (!available.includes(threadCount)) {
      setThreadCount(available[available.length - 1] ?? 1);
    }
  }, [available, threadCount]);

  const capped = available.includes(threadCount) ? threadCount : available[0] ?? 1;
  const processingTimeMs = Math.ceil(BASE_MS / capped);
  const speedup = BASE_MS / processingTimeMs;

  const report = useCallback(() => {
    onChange?.({
      kind: "thread-count",
      threadCount: capped,
      speedup,
      processingTimeMs,
    });
  }, [onChange, capped, speedup, processingTimeMs]);

  useEffect(() => {
    report();
  }, [report]);

  const sliderIndex = Math.max(0, available.indexOf(capped));

  return (
    <div className="space-y-4 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>THREADS </span>
          <span className="text-base font-bold">{capped}</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>TIME </span>
          <span className="text-base font-bold">{processingTimeMs}ms</span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>SPEEDUP </span>
          <span
            className="text-base font-bold"
            style={{ color: speedup >= 8 ? "var(--green)" : "var(--green-dim)" }}
          >
            {speedup.toFixed(1)}x
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label style={{ color: "var(--green-dim)" }}>
          THREAD COUNT (ideal model, no overhead)
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(0, available.length - 1)}
          value={sliderIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setThreadCount(available[idx] ?? 1);
          }}
          disabled={readonly || available.length <= 1}
          className="w-full disabled:opacity-50"
          style={{ accentColor: "var(--green)" }}
        />
        <div className="flex justify-between gap-1" style={{ color: "#1a3d1e" }}>
          {available.map((n) => (
            <span key={n} className="flex-1 text-center">
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-24 items-end gap-1 border-b pb-1" style={{ borderColor: "var(--border)" }}>
        {available.map((n) => {
          const h = (BASE_MS / Math.ceil(BASE_MS / n) / BASE_MS) * 100;
          const active = n === capped;
          return (
            <div
              key={n}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              title={`${n} threads`}
            >
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(12, h)}%`,
                  background: active ? "var(--green)" : "#1a3d1e",
                  minHeight: "6px",
                }}
              />
              <span style={{ color: active ? "var(--green)" : "#1a3d1e", fontSize: "9px" }}>{n}</span>
            </div>
          );
        })}
      </div>

      <p style={{ color: "#1a3d1e" }}>
        {maxThreadCount < 8
          ? " > unlock higher thread counts after the optimize question"
          : " > more threads — less time, if work splits evenly (simplified model)"}
      </p>
    </div>
  );
}
