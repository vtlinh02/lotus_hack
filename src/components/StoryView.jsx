import { useState, useEffect, useCallback } from "react";
import { ChapterNarrative } from "./ChapterNarrative.jsx";
import { WarpSimulation } from "./WarpSimulation.jsx";
import { TermHintBar } from "./TermHintBar.jsx";
import { AIChatPanel } from "./AIChatPanel.jsx";
import { WrongPathReveal } from "./WrongPathReveal.jsx";

const TOTAL_LANES = 32;

export function StoryView({ chapter, onComplete, onGoMap }) {
  const [phase, setPhase] = useState("narrative");
  const [simState, setSimState] = useState({
    maskedCount: chapter.simulation.initialMasked,
    activeLanes: TOTAL_LANES - chapter.simulation.initialMasked,
    utilization:
      ((TOTAL_LANES - chapter.simulation.initialMasked) / TOTAL_LANES) * 100,
  });
  const [pendingAiInput, setPendingAiInput] = useState("");
  const [showWinMessage, setShowWinMessage] = useState(false);

  const handleNarrativeDone = useCallback(() => {
    if (chapter.isWrongPathChapter) {
      setPhase("wrongpath_witness");
    } else {
      setPhase("challenge");
    }
  }, [chapter.isWrongPathChapter]);

  const handleSimChange = useCallback((state) => {
    setSimState(state);
  }, []);

  const handleHintClick = useCallback((term) => {
    setPendingAiInput(`explain: ${term}`);
  }, []);

  const handlePendingConsumed = useCallback(() => {
    setPendingAiInput("");
  }, []);

  useEffect(() => {
    if (phase !== "challenge") return;
    if (!chapter.target) return;
    if (simState.utilization >= chapter.target.utilization) {
      setPhase("success");
      setShowWinMessage(true);
    }
  }, [simState, phase, chapter.target]);

  const handleWrongPathContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const handleSuccessAutoAdvance = useCallback(() => {
    if (chapter.wrongPath) {
      setPhase("wrongpath_reveal");
      setShowWinMessage(false);
    } else {
      onComplete?.();
    }
  }, [chapter.wrongPath, onComplete]);

  const isWrongPathPhase =
    phase === "wrongpath_witness" || phase === "wrongpath_reveal";
  const wrongPathData = chapter.wrongPath ?? (chapter.isWrongPathChapter ? chapter.wrongPath : null);

  return (
    <div
      className={`flex min-h-screen flex-col ${phase === "success" && !showWinMessage ? "chapter-clear-flash" : ""}`}
    >
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border)", background: "rgba(2,10,3,0.9)" }}
      >
        <div>
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "var(--green)" }}
          >
            PARALLEL_XRAY{" "}
          </span>
          <span style={{ color: "var(--green-dim)" }}>
            // CH{chapter.number}: {chapter.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onGoMap}
          className="rounded px-3 py-1.5 text-xs tracking-widest transition"
          style={{
            border: "1px solid var(--green-dim)",
            color: "var(--green-dim)",
          }}
        >
          [ MAP ]
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 space-y-4 overflow-y-auto p-4"
          style={{ minWidth: 0 }}
        >
          {/* Left column: narrative, simulation, target */}
          {phase === "narrative" && (
            <section
              className="rounded p-4"
              style={{
                border: "1px solid var(--border)",
                background: "rgba(3,15,4,0.8)",
              }}
            >
              <p
                className="mb-3 text-xs font-bold tracking-widest"
                style={{ color: "var(--green-dim)" }}
              >
                // MISSION BRIEFING
              </p>
              <ChapterNarrative lines={chapter.narrative} onDone={handleNarrativeDone} />
            </section>
          )}

          {(phase === "challenge" || phase === "success" || phase === "wrongpath_witness") && (
            <>
              <section
                className="rounded p-4"
                style={{
                  border: "1px solid var(--border)",
                  background: "rgba(3,15,4,0.8)",
                }}
              >
                <p
                  className="mb-3 text-xs font-bold tracking-widest"
                  style={{ color: "var(--green-dim)" }}
                >
                  // MISSION BRIEFING
                </p>
                <div className="space-y-1 font-mono text-xs" style={{ color: "var(--green-dim)" }}>
                  {chapter.narrative.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </section>

              {!isWrongPathPhase && (
                <section
                  className="rounded p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "rgba(3,15,4,0.8)",
                  }}
                >
                  <p
                    className="mb-3 text-xs font-bold tracking-widest"
                    style={{ color: "var(--green-dim)" }}
                  >
                    // SIMULATION
                  </p>
                  <WarpSimulation
                    initialMasked={chapter.simulation.initialMasked}
                    readonly={phase === "success" || chapter.simulation.readonly}
                    onChange={handleSimChange}
                  />
                  {chapter.target && (
                    <div className="mt-3 text-xs" style={{ color: "var(--green-dim)" }}>
                      <span className="font-bold" style={{ color: "var(--green)" }}>
                        // TARGET:{" "}
                      </span>
                      {chapter.target.label}
                      <span className="ml-2" style={{ color: "var(--green)" }}>
                        current: {simState.utilization.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </section>
              )}

              {phase === "success" && showWinMessage && chapter.winMessage.length > 0 && (
                <section
                  className="rounded p-4"
                  style={{
                    border: "1px solid var(--green-dim)",
                    background: "rgba(0,255,65,0.06)",
                  }}
                >
                  <ChapterNarrative
                    lines={chapter.winMessage}
                    onDone={() => {
                      setShowWinMessage(false);
                      setTimeout(handleSuccessAutoAdvance, 500);
                    }}
                  />
                </section>
              )}

              {phase === "success" &&
                !showWinMessage &&
                !chapter.wrongPath &&
                (
                  <p className="text-xs" style={{ color: "var(--green)" }}>
                    // chapter complete.{" "}
                    <button
                      type="button"
                      onClick={() => onComplete?.()}
                      className="font-bold underline"
                    >
                      [ CONTINUE ]
                    </button>
                  </p>
                )}
            </>
          )}

          {isWrongPathPhase && wrongPathData && (
            <WrongPathReveal
              wrongPath={wrongPathData}
              onContinue={handleWrongPathContinue}
            />
          )}
        </div>

        <div
          className="flex w-80 flex-col border-l p-4"
          style={{ borderColor: "var(--border)", minWidth: 320 }}
        >
          <p
            className="mb-3 text-xs font-bold tracking-widest"
            style={{ color: "var(--green)" }}
          >
            // XRAY-AI
          </p>
          <TermHintBar
            hints={chapter.termHints}
            onHintClick={handleHintClick}
          />
          <div className="mt-3 flex-1 min-h-0">
            <AIChatPanel
              chapter={chapter}
              pendingInput={pendingAiInput}
              onPendingInputConsumed={handlePendingConsumed}
              disabled={phase === "narrative"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
