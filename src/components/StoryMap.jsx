import { useState } from "react";
import { CHAPTERS } from "../story/chapters.js";

const SIM_TYPE_LABEL = {
  "sequential-vs-parallel": "SIM:PARALLEL",
  "thread-count": "SIM:THREADS",
  "race-condition": "SIM:RACE",
  "cpu-vs-gpu": "SIM:ARCH",
  "mandelbrot-warp": "SIM:WARP/MANDELBROT",
  "warp": "SIM:WARP",
};

export function StoryMap({ chapters = CHAPTERS, isComplete, currentChapterId, onSelect }) {
  const [hovered, setHovered] = useState(null);

  const completedCount = chapters.filter((ch) => isComplete(ch.id)).length;
  const pct = Math.round((completedCount / chapters.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top status bar */}
      <div
        className="rounded px-4 py-3"
        style={{
          border: "1px solid var(--border)",
          background: "rgba(3,15,4,0.9)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] tracking-widest" style={{ color: "var(--green-dim)" }}>
              {"// CURRICULUM_MAP — GPU optimization track"}
            </p>
            <p className="font-mono text-xs" style={{ color: "var(--green-dim)" }}>
              <span style={{ color: "var(--green)" }}>{completedCount}</span>
              {" / "}
              <span>{chapters.length}</span>
              {" chapters cleared"}
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex min-w-[160px] flex-col gap-1">
            <div className="flex justify-between text-[9px] tracking-widest" style={{ color: "#1a3d1e" }}>
              <span>PROGRESS</span>
              <span style={{ color: pct === 100 ? "var(--green)" : "var(--green-dim)" }}>
                {pct}%
              </span>
            </div>
            <div
              className="h-1 w-full rounded-full overflow-hidden"
              style={{ background: "#0d1f0e" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? "var(--green)"
                    : "linear-gradient(90deg, #00aa2a 0%, #00ff41 100%)",
                  boxShadow: pct > 0 ? "0 0 6px #00ff41" : "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chapter list */}
      <div className="space-y-0">
        {chapters.map((ch, idx) => {
          const done = isComplete(ch.id);
          const current = ch.id === currentChapterId;
          const isHovered = hovered === ch.id;
          const simLabel = SIM_TYPE_LABEL[ch.simulation?.type] ?? "SIM:???";
          const hasWrongPath = !!ch.wrongPath || ch.isWrongPathChapter;

          return (
            <div key={ch.id}>
              {/* Chapter row */}
              <div className="flex items-stretch gap-0">
                {/* Left gutter: number + connector */}
                <div className="flex flex-col items-center" style={{ width: 48, flexShrink: 0 }}>
                  {/* Number badge */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded font-mono text-sm font-bold transition-all duration-200 ${done ? "cleared-pulse" : ""}`}
                    style={{
                      background: done
                        ? "var(--green)"
                        : current
                          ? "rgba(0,255,65,0.12)"
                          : "rgba(3,15,4,0.9)",
                      color: done ? "var(--bg)" : "var(--green)",
                      border: done
                        ? "1px solid var(--green)"
                        : current
                          ? "1px solid var(--green)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {done ? "✓" : ch.number}
                  </div>
                  {/* Animated connector */}
                  {idx < chapters.length - 1 && (
                    <div
                      className="connector-line my-1 flex-1"
                      style={{ width: 1, minHeight: 24 }}
                    />
                  )}
                </div>

                {/* Main card */}
                <button
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  onMouseEnter={() => setHovered(ch.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`relative mb-2 ml-3 flex min-h-[72px] flex-1 items-start gap-4 rounded p-3 text-left transition-all duration-200 ${current ? "glitch-card scan-sweep" : ""}`}
                  style={{
                    border: current
                      ? "1px solid var(--green)"
                      : done
                        ? "1px solid var(--green-dim)"
                        : isHovered
                          ? "1px solid #2a5c33"
                          : "1px solid var(--border)",
                    background: current
                      ? "rgba(0,255,65,0.07)"
                      : done
                        ? "rgba(0,170,42,0.04)"
                        : isHovered
                          ? "rgba(3,15,4,0.95)"
                          : "rgba(3,15,4,0.8)",
                    boxShadow: current
                      ? "0 0 18px #00ff4133, inset 0 0 30px rgba(0,255,65,0.03)"
                      : isHovered
                        ? "0 0 10px #00ff4118"
                        : "none",
                    cursor: "pointer",
                  }}
                >
                  {/* Left: title block */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-mono text-sm font-bold tracking-wider"
                        style={{
                          color: current ? "var(--green)" : done ? "var(--green)" : "#2a5c33",
                          textShadow: current ? "0 0 8px #00ff41" : "none",
                        }}
                      >
                        {"CH" + ch.number + ": " + ch.title}
                      </span>
                      {current && (
                        <span
                          className="blink font-mono text-sm font-bold"
                          style={{ color: "var(--green)" }}
                        >
                          _
                        </span>
                      )}
                      {hasWrongPath && (
                        <span
                          className="rounded px-1 py-px font-mono text-[9px] font-bold tracking-widest"
                          style={{
                            background: "#1a0000",
                            color: "#ff4444",
                            border: "1px solid #550000",
                          }}
                        >
                          ⚠ WRONG_PATH
                        </span>
                      )}
                    </div>
                    <p
                      className="font-mono text-[10px] leading-relaxed"
                      style={{ color: "#2a5c33" }}
                    >
                      {"// " + (ch.context ?? ch.narrative?.[0] ?? "")}
                    </p>
                    {/* Term hints as tags */}
                    {ch.termHints?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {ch.termHints.map((t) => (
                          <span
                            key={t}
                            className="rounded px-1.5 py-px font-mono text-[8px] tracking-wider"
                            style={{
                              background: "rgba(0,170,42,0.08)",
                              color: "#1a3d1e",
                              border: "1px solid #1a3d1e",
                            }}
                          >
                            [{t}]
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: status + sim label */}
                  <div className="flex flex-col items-end gap-1.5 text-right" style={{ flexShrink: 0 }}>
                    {/* Status badge */}
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
                      style={
                        done
                          ? {
                              background: "rgba(0,255,65,0.1)",
                              color: "var(--green)",
                              border: "1px solid var(--green-dim)",
                            }
                          : current
                            ? {
                                background: "rgba(0,255,65,0.08)",
                                color: "var(--green)",
                                border: "1px solid var(--green)",
                              }
                            : {
                                background: "transparent",
                                color: "#1a3d1e",
                                border: "1px solid #1a3d1e",
                              }
                      }
                    >
                      {done ? "CLEARED" : current ? "ACTIVE" : "OPEN"}
                    </span>
                    {/* Sim type chip */}
                    <span
                      className="font-mono text-[8px] tracking-widest"
                      style={{ color: "#1a3d1e" }}
                    >
                      {simLabel}
                    </span>
                    {/* Target label on hover or if active */}
                    {(isHovered || current) && ch.target?.label && (
                      <span
                        className="max-w-[140px] text-right font-mono text-[8px] leading-snug tracking-wider"
                        style={{ color: "#2a5c33" }}
                      >
                        {"TARGET: " + ch.target.label}
                      </span>
                    )}
                  </div>

                  {/* Hover: right-edge scan accent */}
                  {isHovered && !current && (
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 w-px"
                      style={{ background: "var(--green)", opacity: 0.3 }}
                    />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="text-[10px] tracking-widest" style={{ color: "#1a3d1e" }}>
        {"// click any chapter to enter — no prerequisites required"}
      </p>
    </div>
  );
}
