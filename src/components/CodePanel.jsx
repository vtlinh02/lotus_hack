export function CodePanel({ codeSnippet }) {
  if (!codeSnippet) return null;

  return (
    <section
      className="rounded p-4"
      style={{
        border: "1px solid var(--border)",
        background: "rgba(3,15,4,0.8)",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <p
          className="text-xs font-bold tracking-widest"
          style={{ color: "var(--green-dim)" }}
        >
          // THE CODE
        </p>
        <span
          className="rounded px-2 py-0.5 font-mono text-xs"
          style={{
            background: "rgba(0,255,65,0.07)",
            border: "1px solid var(--border)",
            color: "var(--green-dim)",
          }}
        >
          {codeSnippet.filename}
        </span>
      </div>

      <div
        className="overflow-x-auto rounded p-3 font-mono text-xs"
        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #0d2b0f" }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {codeSnippet.lines.map((line, i) => (
              <tr
                key={i}
                style={
                  line.highlight
                    ? { background: "rgba(255,60,60,0.08)" }
                    : undefined
                }
              >
                {/* Line number */}
                <td
                  className="select-none pr-4 text-right"
                  style={{
                    color: "#1a3d1e",
                    minWidth: "2rem",
                    verticalAlign: "top",
                    paddingTop: "1px",
                  }}
                >
                  {i + 1}
                </td>

                {/* Code */}
                <td
                  className="whitespace-pre pr-6"
                  style={{
                    color: line.highlight ? "#ff6b6b" : "var(--green-dim)",
                    verticalAlign: "top",
                    paddingTop: "1px",
                  }}
                >
                  {line.code || "\u00a0"}
                </td>

                {/* Annotation */}
                <td
                  className="whitespace-nowrap"
                  style={{
                    color: line.highlight ? "#ff4d4d" : "#2a5c2e",
                    verticalAlign: "top",
                    paddingTop: "1px",
                    fontStyle: "italic",
                  }}
                >
                  {line.annotation ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="mt-2 text-xs"
        style={{ color: "#1a3d1e" }}
      >
        // red lines = the problem. ask XRAY-AI to understand why.
      </p>
    </section>
  );
}
