import { useState, useEffect, useRef } from "react";

const CHAR_MS = 16;
const LINE_PAUSE_MS = 300;

export function WrongPathReveal({ wrongPath, onContinue }) {
  const [printedLines, setPrintedLines] = useState([]);
  const [currentLineChars, setCurrentLineChars] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [narrativeDone, setNarrativeDone] = useState(false);
  const [pausing, setPausing] = useState(false);
  const intervalRef = useRef(null);
  const pauseRef = useRef(null);

  const lines = wrongPath?.narrative ?? [];

  useEffect(() => {
    if (lines.length === 0) {
      setNarrativeDone(true);
      return;
    }
    if (narrativeDone || lineIndex >= lines.length) return;
    if (pausing) return;

    const line = lines[lineIndex];
    const targetChars = line.length;

    if (currentLineChars >= targetChars) {
      setPrintedLines((prev) => [...prev, line]);
      setCurrentLineChars(0);
      setLineIndex((i) => i + 1);
      setPausing(true);
      pauseRef.current = setTimeout(() => setPausing(false), LINE_PAUSE_MS);
      return () => clearTimeout(pauseRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCurrentLineChars((c) => {
        const next = c + 1;
        if (next >= targetChars) clearInterval(intervalRef.current);
        return next;
      });
    }, CHAR_MS);
    return () => clearInterval(intervalRef.current);
  }, [lines, lineIndex, currentLineChars, narrativeDone, pausing]);

  useEffect(() => {
    if (lineIndex >= lines.length && lines.length > 0) {
      setNarrativeDone(true);
    }
  }, [lineIndex, lines.length]);

  return (
    <section
      className="rounded p-4"
      style={{
        border: "1px solid var(--red-error)",
        background: "rgba(255,68,68,0.06)",
      }}
    >
      <p
        className="mb-3 text-xs font-bold tracking-widest"
        style={{ color: "var(--red-error)" }}
      >
        // WRONG PATH
      </p>
      <div className="space-y-1 font-mono text-xs" style={{ color: "var(--red-error)" }}>
        {printedLines.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
        {lineIndex < lines.length && (
          <p>{(lines[lineIndex] ?? "").slice(0, currentLineChars)}</p>
        )}
      </div>
      {narrativeDone && wrongPath?.lesson && (
        <div
          className="mt-4 rounded p-3"
          style={{
            border: "1px solid var(--green-dim)",
            background: "rgba(0,255,65,0.04)",
            color: "var(--green-dim)",
          }}
        >
          <p className="text-xs font-bold tracking-widest" style={{ color: "var(--green)" }}>
            // LESSON LEARNED
          </p>
          <p className="mt-2 text-sm leading-relaxed">{wrongPath.lesson}</p>
        </div>
      )}
      {narrativeDone && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onContinue}
            className="rounded px-5 py-2 text-xs font-bold tracking-widest transition-all"
            style={{
              border: "1px solid var(--green)",
              background: "var(--green)",
              color: "var(--bg)",
            }}
          >
            [ CONTINUE → ]
          </button>
        </div>
      )}
    </section>
  );
}
