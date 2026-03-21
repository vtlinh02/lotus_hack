export function OverviewCard({ title, subtitle, painPoint, onSkip }) {
  return (
    <section
      className="rounded p-5"
      style={{
        border: "1px solid var(--green-dim)",
        background: "rgba(3,15,4,0.9)",
        boxShadow: "0 0 20px #00ff4111",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs tracking-widest" style={{ color: "var(--green-dim)" }}>
            // LEVEL OVERVIEW
          </p>
          <h2
            className="glow-text text-xl font-bold tracking-widest"
            style={{ color: "var(--green)" }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs tracking-wide" style={{ color: "var(--green-dim)" }}>
              {subtitle}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed" style={{ color: "#a3c9a8" }}>
            {painPoint}
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 self-start rounded px-4 py-2 text-xs tracking-widest transition-all"
          style={{
            border: "1px solid var(--border)",
            color: "#1a5c20",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--green-dim)";
            e.currentTarget.style.color = "var(--green-dim)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "#1a5c20";
          }}
        >
          [ I KNOW THIS — SKIP ]
        </button>
      </div>
    </section>
  );
}
