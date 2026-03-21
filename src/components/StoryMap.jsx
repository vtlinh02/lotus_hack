import { CHAPTERS } from "../story/chapters.js";

export function StoryMap({ chapters = CHAPTERS, isComplete, currentChapterId, onSelect }) {
  return (
    <div className="space-y-4">
      <p
        className="text-xs leading-relaxed tracking-wide"
        style={{ color: "var(--green-dim)" }}
      >
        // Select a chapter to continue your optimization journey.
      </p>
      <div className="flex flex-col gap-2">
        {chapters.map((ch, idx) => {
          const done = isComplete(ch.id);
          const current = ch.id === currentChapterId;
          const hasWrongPath = !!ch.wrongPath || ch.isWrongPathChapter;

          return (
            <div key={ch.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  className="flex flex-col items-center gap-1 rounded p-4 text-center transition-all"
                  style={{
                    border: current
                      ? "1px solid var(--green)"
                      : done
                      ? "1px solid var(--green-dim)"
                      : "1px solid var(--border)",
                    background: current
                      ? "rgba(0,255,65,0.08)"
                      : done
                      ? "rgba(0,170,42,0.04)"
                      : "rgba(3,15,4,0.9)",
                    boxShadow: current ? "0 0 12px #00ff4133" : "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded text-sm font-bold"
                    style={{
                      background: done ? "var(--green)" : "transparent",
                      color: done ? "var(--bg)" : "var(--green)",
                      border: done ? "none" : "1px solid var(--green-dim)",
                    }}
                  >
                    {done ? "✓" : ch.number}
                  </span>
                  <span
                    className="text-sm font-bold tracking-wide"
                    style={{ color: "var(--green)" }}
                  >
                    {ch.title}
                  </span>
                  <span
                    className="text-xs tracking-widest"
                    style={{ color: done ? "var(--green)" : "#1a3d1e" }}
                  >
                    {done ? "CLEARED" : "OPEN"}
                  </span>
                </button>
                {idx < chapters.length - 1 && (
                  <div
                    className="my-1 h-4 w-px"
                    style={{ background: "var(--border)" }}
                  />
                )}
              </div>
              {hasWrongPath && (
                <span
                  className="mt-4 text-[10px] tracking-wider"
                  style={{ color: "#ff4444" }}
                >
                  ⚠ WRONG PATH
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
