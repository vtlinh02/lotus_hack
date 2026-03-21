import { useState } from "react";

const N = 8;       // matrix size
const TILE = 4;    // tile size
const N_TILES = N / TILE;  // 2

// Naive: each of N*N output cells loads N from A + N from B = 2*N³
const NAIVE_LOADS = N * N * N * 2;  // 1024 for 8x8

// Tiled: each tile-block needs (N/TILE) phases. Each phase loads TILE² from A + TILE² from B.
// Phases = N/TILE = 2. Loads per block = 2 * (16 + 16) = 64. Total = 4 * 64 = 256.
const TILED_LOADS_CORRECT = N_TILES * N_TILES * (N / TILE) * (TILE * TILE * 2);
const REDUCTION = Math.round(NAIVE_LOADS / TILED_LOADS_CORRECT);

function MatrixGrid({ label, dim, tileSize, highlightTile }) {
  const cells = [];
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      const ti = Math.floor(i / tileSize);
      const tj = Math.floor(j / tileSize);
      const isHighlighted = highlightTile !== null && ti === highlightTile[0] && tj === highlightTile[1];
      cells.push(
        <div
          key={`${i}-${j}`}
          className="flex items-center justify-center text-[10px] font-bold"
          style={{
            gridColumn: j + 1,
            gridRow: i + 1,
            border: "1px solid var(--border)",
            background: isHighlighted ? "rgba(0,255,65,0.15)" : "rgba(3,15,4,0.9)",
            color: "var(--green-dim)",
            minWidth: 24,
            minHeight: 24,
          }}
        >
          {label === "C" ? `c${i}${j}` : `${label}${i}${j}`}
        </div>
      );
    }
  }
  return (
    <div
      className="grid gap-px"
      style={{
        gridTemplateColumns: `repeat(${dim}, 1fr)`,
        gridTemplateRows: `repeat(${dim}, 1fr)`,
        width: dim * 32,
        height: dim * 32,
      }}
    >
      {cells}
    </div>
  );
}

export function Simulation() {
  const [mode, setMode] = useState("naive");

  const loads = mode === "naive" ? NAIVE_LOADS : TILED_LOADS_CORRECT;

  return (
    <div className="space-y-5 text-xs tracking-wide" style={{ color: "var(--green)" }}>
      {/* Mode toggle */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setMode("naive")}
          className="rounded px-4 py-2 font-bold tracking-widest transition-all"
          style={{
            border: mode === "naive" ? "1px solid var(--green)" : "1px solid var(--border)",
            background: mode === "naive" ? "rgba(0,255,65,0.12)" : "transparent",
            color: mode === "naive" ? "var(--green)" : "var(--green-dim)",
          }}
        >
          [ NAIVE ]
        </button>
        <button
          type="button"
          onClick={() => setMode("tiled")}
          className="rounded px-4 py-2 font-bold tracking-widest transition-all"
          style={{
            border: mode === "tiled" ? "1px solid var(--green)" : "1px solid var(--border)",
            background: mode === "tiled" ? "rgba(0,255,65,0.12)" : "transparent",
            color: mode === "tiled" ? "var(--green)" : "var(--green-dim)",
          }}
        >
          [ TILED ]
        </button>
      </div>

      {/* Visual layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: C matrix with tile overlay */}
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--green-dim)" }}>
            C = A × B ({N}×{N}), tile {TILE}×{TILE}
          </p>
          <div
            className="relative rounded p-2"
            style={{
              border: "1px solid var(--border)",
              background: "rgba(3,15,4,0.9)",
            }}
          >
            <MatrixGrid
              label="C"
              dim={N}
              tileSize={TILE}
              highlightTile={null}
            />
          </div>
        </div>

        {/* Right: Memory boxes */}
        <div className="flex flex-col gap-4">
          {/* Global memory */}
          <div
            className="rounded p-4"
            style={{
              border: "1px solid var(--green-dim)",
              background: "rgba(0,42,10,0.3)",
            }}
          >
            <p className="mb-2 text-xs font-bold tracking-widest" style={{ color: "var(--green-dim)" }}>
              GLOBAL MEMORY
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#a3c9a8" }}>
              {mode === "naive"
                ? "Each C[i,j] streams full row of A + full col of B from here."
                : "Tiles loaded from here into shared memory per block."}
            </p>
          </div>

          {/* Shared memory — only prominent in tiled mode */}
          {mode === "tiled" && (
            <div
              className="rounded p-4"
              style={{
                border: "1px solid var(--green)",
                background: "rgba(0,255,65,0.08)",
                boxShadow: "0 0 16px rgba(0,255,65,0.2)",
              }}
            >
              <p className="mb-2 text-xs font-bold tracking-widest" style={{ color: "var(--green)" }}>
                SHARED MEMORY
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#a3c9a8" }}>
                One tile of A + one tile of B. All threads in block read from here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Load counter */}
      <div
        className="rounded p-4"
        style={{
          border: "1px solid var(--border)",
          background: "rgba(3,15,4,0.9)",
        }}
      >
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-xs" style={{ color: "var(--green-dim)" }}>GLOBAL_LOADS </span>
            <span className="glow-text ml-2 text-lg font-bold" style={{ color: "var(--green)" }}>
              {loads}
            </span>
          </div>
          {mode === "tiled" && (
            <div
              className="rounded px-3 py-1 text-xs font-bold"
              style={{
                border: "1px solid var(--green)",
                color: "var(--green)",
              }}
            >
              {REDUCTION}x fewer than naive
            </div>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: "#1a3d1e" }}>
          {mode === "naive"
            ? `Naive: ${N}×${N} outputs × (${N} from A + ${N} from B) = ${NAIVE_LOADS}`
            : `Tiled: ${N_TILES * N_TILES} tile-blocks × ${N / TILE} phases × ${TILE * TILE * 2} loads = ${TILED_LOADS_CORRECT}`}
        </p>
      </div>
    </div>
  );
}
