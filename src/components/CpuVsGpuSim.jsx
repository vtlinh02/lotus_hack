import { useCallback, useState, useEffect, useRef } from "react";

const CPU_CORES = 8;
const GPU_TILES = 64;

export function CpuVsGpuSim({ readonly = false, onChange }) {
  const [mode, setMode] = useState(null);
  const [activeCpu, setActiveCpu] = useState([]);
  const [activeGpu, setActiveGpu] = useState([]);
  const [demoDone, setDemoDone] = useState(false);
  const timerRef = useRef(null);

  const report = useCallback(() => {
    onChange?.({
      kind: "cpu-vs-gpu",
      architectureDemo: demoDone,
    });
  }, [onChange, demoDone]);

  useEffect(() => {
    report();
  }, [report]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const runCpu = () => {
    if (readonly) return;
    clearTimers();
    setDemoDone(false);
    setMode("cpu");
    setActiveGpu([]);
    setActiveCpu([]);
    let tick = 0;
    timerRef.current = setInterval(() => {
      setActiveCpu([tick % CPU_CORES]);
      tick++;
      if (tick >= 24) {
        clearTimers();
        setActiveCpu([]);
      }
    }, 280);
  };

  const runGpu = () => {
    if (readonly) return;
    clearTimers();
    setDemoDone(false);
    setMode("gpu");
    setActiveCpu([]);
    let wave = 0;
    const waves = 4;
    const perWave = Math.ceil(GPU_TILES / waves);
    timerRef.current = setInterval(() => {
      const start = wave * perWave;
      const next = [];
      for (let i = 0; i < perWave && start + i < GPU_TILES; i++) {
        next.push(start + i);
      }
      setActiveGpu((prev) => [...prev, ...next]);
      wave++;
      if (wave >= waves) {
        clearTimers();
        setDemoDone(true);
      }
    }, 120);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="space-y-5 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      <div className="flex flex-wrap gap-6 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--green-dim)" }}>CPU_CORES </span>
          <span className="text-base font-bold">{CPU_CORES}</span>
          <span className="ml-2" style={{ color: "#1a3d1e" }}>
            wide, independent
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>GPU_LANES </span>
          <span className="text-base font-bold">{GPU_TILES}</span>
          <span className="ml-2" style={{ color: "#1a3d1e" }}>
            same op, lockstep
          </span>
        </div>
        <div>
          <span style={{ color: "var(--green-dim)" }}>DEMO </span>
          <span className="text-base font-bold" style={{ color: demoDone ? "var(--green)" : "#1a3d1e" }}>
            {demoDone ? "GPU_OK" : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 font-bold" style={{ color: "var(--green-dim)" }}>
            {"// CPU — few cores, different tasks"}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: CPU_CORES }, (_, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded text-[10px] font-bold"
                style={{
                  border: "2px solid var(--border)",
                  background: activeCpu.includes(i) ? "var(--green)" : "#050a06",
                  color: activeCpu.includes(i) ? "var(--bg)" : "var(--green-dim)",
                }}
              >
                C{i}
              </div>
            ))}
          </div>
          <p className="mt-2" style={{ color: "#1a3d1e" }}>
            fills work in waves of {CPU_CORES}
          </p>
        </div>

        <div>
          <p className="mb-2 font-bold" style={{ color: "var(--green-dim)" }}>
            {"// GPU — many units, same instruction"}
          </p>
          <div className="flex flex-wrap gap-0.5">
            {Array.from({ length: GPU_TILES }, (_, i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-sm"
                style={{
                  border: "1px solid #0d2b0f",
                  background: activeGpu.includes(i) ? "var(--green)" : "#030f04",
                }}
              />
            ))}
          </div>
          <p className="mt-2" style={{ color: "#1a3d1e" }}>
            throughput-oriented (simplified)
          </p>
        </div>
      </div>

      {!readonly && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runCpu}
            className="rounded px-4 py-2 font-bold tracking-widest"
            style={{
              border: "1px solid var(--green-dim)",
              color: "var(--green-dim)",
              background: mode === "cpu" ? "rgba(0,255,65,0.06)" : "transparent",
            }}
          >
            [ RUN CPU DEMO ]
          </button>
          <button
            type="button"
            onClick={runGpu}
            className="rounded px-4 py-2 font-bold tracking-widest"
            style={{
              border: "1px solid var(--green)",
              color: "var(--green)",
              background: mode === "gpu" ? "rgba(0,255,65,0.1)" : "transparent",
            }}
          >
            [ RUN GPU DEMO ]
          </button>
        </div>
      )}

      <p style={{ color: "#1a3d1e" }}>
        {" > run the GPU demo to complete the architecture target (throughput in parallel)"}
      </p>
    </div>
  );
}
