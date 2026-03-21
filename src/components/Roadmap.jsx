export function Roadmap({ lessons, isDone, onSelect, selectedId }) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-0 px-1 py-4">
        {lessons.map((lesson, idx) => {
          const done = isDone(lesson.id);
          const selected = lesson.id === selectedId;

          return (
            <div key={lesson.id} className="flex items-center">
              {/* Animated dashed connector */}
              {idx > 0 ? (
                <div className="connector-line mx-1 w-8 shrink-0 sm:w-14" aria-hidden />
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(lesson.id)}
                className="flex w-36 flex-col items-center gap-2 rounded p-4 text-center transition-all duration-150 sm:w-44"
                style={{
                  border: selected
                    ? "1px solid var(--green)"
                    : done
                    ? "1px solid var(--green-dim)"
                    : "1px solid var(--border)",
                  background: selected
                    ? "rgba(0,255,65,0.06)"
                    : done
                    ? "rgba(0,170,42,0.04)"
                    : "rgba(3,15,4,0.9)",
                  boxShadow: selected ? "0 0 16px #00ff4133, 0 0 4px #00ff41" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.border = "1px solid var(--green-dim)";
                    e.currentTarget.style.boxShadow = "0 0 8px #00ff4122";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.border = done
                      ? "1px solid var(--green-dim)"
                      : "1px solid var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {/* Level badge */}
                <span
                  className="flex h-10 w-10 items-center justify-center rounded text-sm font-bold"
                  style={{
                    background: done
                      ? "var(--green)"
                      : selected
                      ? "rgba(0,255,65,0.12)"
                      : "rgba(3,15,4,0.9)",
                    color: done ? "var(--bg)" : "var(--green)",
                    border: done ? "none" : "1px solid var(--green-dim)",
                    textShadow: !done ? "0 0 8px var(--green)" : "none",
                  }}
                >
                  {done ? ">_" : lesson.number}
                </span>

                {/* Title */}
                <span
                  className="text-sm font-bold leading-tight tracking-wide"
                  style={{ color: "var(--green)" }}
                >
                  {lesson.title}
                </span>

                {/* Subtitle */}
                <span
                  className="text-xs leading-tight"
                  style={{ color: "var(--green-dim)" }}
                >
                  {lesson.subtitle}
                </span>

                {/* Status label */}
                <span
                  className="mt-1 text-xs tracking-widest"
                  style={{ color: done ? "var(--green)" : "#1a3d1e" }}
                >
                  {done ? "CLEARED" : "LOCKED"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
