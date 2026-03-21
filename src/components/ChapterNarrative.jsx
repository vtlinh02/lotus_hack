import { useEffect, useState, useRef, useCallback } from "react";

const CHAR_MS = 16;
const LINE_PAUSE_MS = 300;

export function ChapterNarrative({ lines = [], onDone }) {
  const [printedLines, setPrintedLines] = useState([]);
  const [currentLineChars, setCurrentLineChars] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [pausing, setPausing] = useState(false);
  const intervalRef = useRef(null);
  const pauseRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const skip = useCallback(() => {
    if (done) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pauseRef.current) clearTimeout(pauseRef.current);
    setPrintedLines([...lines]);
    setCurrentLineChars(0);
    setLineIndex(lines.length);
    setPausing(false);
    setDone(true);
    onDoneRef.current?.();
  }, [lines, done]);

  useEffect(() => {
    if (lines.length === 0) {
      onDoneRef.current?.();
      return;
    }
    if (done || lineIndex >= lines.length) return;
    if (pausing) return;

    const line = lines[lineIndex];
    const targetChars = line.length;

    if (currentLineChars >= targetChars) {
      setPrintedLines((prev) => [...prev, line]);
      setCurrentLineChars(0);
      setLineIndex((i) => i + 1);
      setPausing(true);
      pauseRef.current = setTimeout(() => {
        setPausing(false);
      }, LINE_PAUSE_MS);
      return () => clearTimeout(pauseRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCurrentLineChars((c) => {
        const next = c + 1;
        if (next >= targetChars) {
          clearInterval(intervalRef.current);
        }
        return next;
      });
    }, CHAR_MS);
    return () => clearInterval(intervalRef.current);
  }, [lines, lineIndex, currentLineChars, done, pausing]);

  useEffect(() => {
    if (done) return;
    if (lineIndex >= lines.length && printedLines.length === lines.length && lines.length > 0) {
      setDone(true);
      onDoneRef.current?.();
    }
  }, [lineIndex, printedLines.length, lines.length, done]);

  const isLastLineComplete =
    lineIndex === lines.length && printedLines.length === lines.length;
  const showCursor =
    !done &&
    lines.length > 0 &&
    (lineIndex < lines.length
      ? currentLineChars >= (lines[lineIndex] ?? "").length && lineIndex === lines.length - 1
      : true);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={skip}
      onKeyDown={(e) => e.key === "Enter" && skip()}
      className="cursor-pointer select-none space-y-1 font-mono text-xs"
      style={{ color: "var(--green-dim)" }}
    >
      {printedLines.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {lineIndex < lines.length && (
        <p>
          {(lines[lineIndex] ?? "").slice(0, currentLineChars)}
          {currentLineChars >= (lines[lineIndex] ?? "").length &&
            lineIndex === lines.length - 1 &&
            !done && <span className="cursor-blink inline-block w-2">|</span>}
        </p>
      )}
      {isLastLineComplete && !done && (
        <p>
          <span className="cursor-blink inline-block w-2">|</span>
        </p>
      )}
    </div>
  );
}
