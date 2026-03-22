import { useState, useEffect, useRef } from "react";

const LABELS = ["A", "B", "C", "D"];
const CHAR_MS = 18;
const LINE_PAUSE_MS = 250;

function FeedbackTypewriter({ lines, onDone }) {
  const [printed, setPrinted] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const intervalRef = useRef(null);
  const pauseRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setPrinted([]);
    setCharCount(0);
    setLineIdx(0);
  }, [lines]);

  useEffect(() => {
    if (lineIdx >= lines.length) {
      if (printed.length === lines.length && lines.length > 0) {
        onDoneRef.current?.();
      }
      return;
    }
    const line = lines[lineIdx];
    if (charCount >= line.length) {
      setPrinted((p) => [...p, line]);
      setCharCount(0);
      setLineIdx((i) => i + 1);
      pauseRef.current = setTimeout(() => {}, LINE_PAUSE_MS);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCharCount((c) => {
        const next = c + 1;
        if (next >= line.length) clearInterval(intervalRef.current);
        return next;
      });
    }, CHAR_MS);
    return () => clearInterval(intervalRef.current);
  }, [lines, lineIdx, charCount, printed.length]);

  return (
    <div className="space-y-1 font-mono text-xs" style={{ color: "var(--green-dim)" }}>
      {printed.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
      {lineIdx < lines.length && (
        <p>{lines[lineIdx].slice(0, charCount)}</p>
      )}
    </div>
  );
}

export function OptimizePanel({ optimize, onCorrect }) {
  const [attempted, setAttempted] = useState(new Set());
  const [feedbackIdx, setFeedbackIdx] = useState(null);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [solved, setSolved] = useState(false);

  if (!optimize) return null;

  const currentChoice = feedbackIdx !== null ? optimize.choices[feedbackIdx] : null;
  const isCorrectFeedback = currentChoice?.correct ?? false;

  function handleChoose(idx) {
    if (solved || feedbackIdx !== null) return;
    setFeedbackIdx(idx);
    setFeedbackDone(false);
    setAttempted((prev) => new Set([...prev, idx]));
  }

  function handleFeedbackDone() {
    setFeedbackDone(true);
    if (isCorrectFeedback) {
      setSolved(true);
      onCorrect?.();
    }
  }

  function handleRetry() {
    setFeedbackIdx(null);
    setFeedbackDone(false);
  }

  return (
    <section
      className="rounded p-4"
      style={{
        border: `1px solid ${solved ? "var(--green)" : "var(--border)"}`,
        background: solved
          ? "rgba(0,255,65,0.04)"
          : "rgba(3,15,4,0.8)",
        transition: "border-color 0.4s",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <p
          className="text-xs font-bold tracking-widest"
          style={{ color: solved ? "var(--green)" : "var(--green-dim)" }}
        >
          // OPTIMIZE
        </p>
        {solved && (
          <span
            className="font-mono text-xs"
            style={{ color: "var(--green)" }}
          >
            [ FIX APPLIED ]
          </span>
        )}
      </div>

      {!solved && (
        <>
          {feedbackIdx === null ? (
            <div className="space-y-3">
              <p className="font-mono text-xs" style={{ color: "var(--gray-subtle)" }}>
                &gt; stuck? ask XRAY-AI about the suggested terms.
              </p>
              <p className="font-mono text-xs" style={{ color: "var(--green-dim)" }}>
                &gt; {optimize.prompt}
              </p>
              <div className="space-y-2 pt-1">
                {optimize.choices.map((choice, idx) => {
                  const tried = attempted.has(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChoose(idx)}
                      disabled={tried}
                      className="flex w-full items-start gap-3 rounded px-3 py-2.5 text-left font-mono text-xs transition-all"
                      style={{
                        border: tried
                          ? "1px solid #0d2b0f"
                          : "1px solid var(--border)",
                        background: "transparent",
                        color: tried ? "var(--gray-subtle)" : "var(--green-dim)",
                        cursor: tried ? "not-allowed" : "pointer",
                        opacity: tried ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!tried) {
                          e.currentTarget.style.borderColor = "var(--green)";
                          e.currentTarget.style.color = "var(--green)";
                          e.currentTarget.style.background = "rgba(0,255,65,0.04)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!tried) {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--green-dim)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <span
                        className="shrink-0 font-bold"
                        style={{ color: tried ? "var(--gray-subtle)" : "var(--green)" }}
                      >
                        [{LABELS[idx]}]
                      </span>
                      <span>{choice.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p
                className="font-mono text-xs font-bold"
                style={{ color: isCorrectFeedback ? "var(--green)" : "#ff4d4d" }}
              >
                {isCorrectFeedback ? "> // CORRECT" : "> // WRONG PATH"}
              </p>
              <FeedbackTypewriter
                lines={currentChoice.feedback}
                onDone={handleFeedbackDone}
              />
              {feedbackDone && !isCorrectFeedback && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 font-mono text-xs tracking-widest transition-all"
                  style={{
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--green-dim)",
                    padding: "4px 12px",
                    borderRadius: "4px",
                  }}
                >
                  [ TRY AGAIN ]
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Solved state */}
      {solved && (
        <p className="font-mono text-xs" style={{ color: "var(--green)" }}>
          &gt; fix applied. check the simulation below.
        </p>
      )}
    </section>
  );
}
