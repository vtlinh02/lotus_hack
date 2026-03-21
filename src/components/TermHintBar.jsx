export function TermHintBar({ hints = [], onHintClick }) {
  if (hints.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold tracking-widest" style={{ color: "var(--green-dim)" }}>
        // SUGGESTED TERMS — ask XRAY-AI:
      </p>
      <div className="flex flex-wrap gap-2">
        {hints.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onHintClick(term)}
            className="rounded px-3 py-1.5 text-xs font-medium tracking-wide transition-all"
            style={{
              border: "1px solid var(--green-dim)",
              background: "transparent",
              color: "var(--green-dim)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--green)";
              e.currentTarget.style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--green-dim)";
              e.currentTarget.style.color = "var(--green-dim)";
            }}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
