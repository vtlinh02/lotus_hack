export function TheoryPanel({ title = "THEORY", children }) {
  return (
    <section
      className="rounded p-5"
      style={{ border: "1px solid var(--border)", background: "rgba(3,15,4,0.8)" }}
    >
      <h3
        className="mb-4 text-xs font-bold tracking-widest"
        style={{ color: "var(--green-dim)" }}
      >
        // {title}
      </h3>
      <div className="max-h-[min(55vh,32rem)] overflow-y-auto pr-1">
        {children}
      </div>
    </section>
  );
}
