import { useRef, useEffect, useState, useCallback } from "react";
import { useWasm } from "../../hooks/useWasm.js";

function drawMemoryTrace(ctx, canvas, trace) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "11px ui-monospace, monospace";

  const lanes = trace.warp_width;
  const cellW = canvas.width / lanes;
  const cellH = 70;

  const colorMap = new Map();
  const palette = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#ca8a04",
    "#4f46e5",
  ];

  function colorForSegment(seg) {
    if (seg < 0) return "#111827";
    if (!colorMap.has(seg)) {
      colorMap.set(seg, palette[colorMap.size % palette.length]);
    }
    return colorMap.get(seg);
  }

  for (let lane = 0; lane < lanes; lane++) {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(lane * cellW, 0, cellW - 1, 40);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(`${lane}`, lane * cellW + 6, 24);
  }

  for (let lane = 0; lane < lanes; lane++) {
    const active = trace.active_mask[lane] === 1;
    const seg = trace.lane_segments[lane];
    ctx.fillStyle = active ? colorForSegment(seg) : "#111827";
    ctx.fillRect(lane * cellW, 50, cellW - 1, cellH);
    ctx.fillStyle = "#ffffff";
    if (active) {
      ctx.fillText(`S${seg}`, lane * cellW + 4, 92);
    }
  }

  for (let lane = 0; lane < lanes; lane++) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(lane * cellW, 130, cellW - 1, cellH);
    ctx.fillStyle = "#93c5fd";
    const addr = trace.lane_addresses[lane];
    if (addr >= 0) {
      ctx.fillText(`${addr}`, lane * cellW + 2, 172);
    }
  }
}

export function Simulation() {
  const canvasRef = useRef(null);
  const { module, error } = useWasm();
  const [strideWords, setStrideWords] = useState(1);
  const [baseAddress, setBaseAddress] = useState(0);
  const [memoryMeta, setMemoryMeta] = useState("");

  const runLab = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !module) return;
    const ctx = canvas.getContext("2d");
    const trace = module.simulateCoalescing({
      warp_width: 32,
      word_size: 4,
      base_address: baseAddress,
      stride_words: strideWords,
      active_mask: new Array(32).fill(1),
    });
    drawMemoryTrace(ctx, canvas, trace);
    setMemoryMeta(
      `transactions: ${trace.num_transactions}\n` +
        `requested_bytes: ${trace.requested_bytes}\n` +
        `fetched_bytes: ${trace.fetched_bytes}\n` +
        `load_efficiency: ${(trace.load_efficiency * 100).toFixed(2)}%\n` +
        `rule: unique 32-byte segments touched by active warp lanes`
    );
  }, [module, strideWords, baseAddress]);

  useEffect(() => {
    runLab();
  }, [runLab]);

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load WASM: {error?.message ?? String(error)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2 text-slate-300">
          Pattern
          <select
            id="patternSelect"
            value={strideWords}
            onChange={(e) => setStrideWords(Number(e.target.value))}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value={1}>Contiguous (stride 1)</option>
            <option value={2}>Stride 2</option>
            <option value={4}>Stride 4</option>
            <option value={8}>Stride 8</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          Base address (bytes)
          <input
            id="baseAddressInput"
            type="number"
            value={baseAddress}
            step={4}
            onChange={(e) => setBaseAddress(Number(e.target.value))}
            className="w-28 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        id="memoryCanvas"
        width={640}
        height={220}
        className="w-full max-w-[640px] border border-slate-600 bg-black [image-rendering:pixelated]"
      />
      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-400">{memoryMeta}</pre>
    </div>
  );
}
