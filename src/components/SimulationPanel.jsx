export function SimulationPanel({ title = "SIMULATION", children }) {
  return (
    <section
      className="rounded p-5"
      style={{
        border: "1px solid var(--green-dim)",
        background: "rgba(3,15,4,0.9)",
        boxShadow: "0 0 12px #00ff4108",
      }}
    >
      <h3
        className="mb-4 text-xs font-bold tracking-widest"
        style={{ color: "var(--green)" }}
      >
        // {title} — INTERACTIVE
      </h3>
      <div style={{ color: "var(--green)" }}>{children}</div>
    </section>
  );
}
