import { useState, useEffect, useCallback } from "react";
import { ChapterNarrative } from "./ChapterNarrative.jsx";
import { WarpSimulation } from "./WarpSimulation.jsx";
import { MandelbrotWarpSim } from "./MandelbrotWarpSim.jsx";
import { SequentialVsParallelSim } from "./SequentialVsParallelSim.jsx";
import { ThreadCountSim } from "./ThreadCountSim.jsx";
import { RaceConditionSim } from "./RaceConditionSim.jsx";
import { CpuVsGpuSim } from "./CpuVsGpuSim.jsx";
import { TermHintBar } from "./TermHintBar.jsx";
import { AIChatPanel } from "./AIChatPanel.jsx";
import { WrongPathReveal } from "./WrongPathReveal.jsx";
import { CodePanel } from "./CodePanel.jsx";
import { OptimizePanel } from "./OptimizePanel.jsx";
import {
  getInitialSimState,
  meetsTarget,
  formatTargetCurrent,
} from "../story/simState.js";

export function StoryView({ chapter, onComplete, onGoMap }) {
  const [phase, setPhase] = useState("narrative");
  const [simState, setSimState] = useState(() => getInitialSimState(chapter));
  const [pendingAiInput, setPendingAiInput] = useState("");
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [simInitialMasked, setSimInitialMasked] = useState(
    chapter.simulation?.type === "warp"
      ? chapter.simulation.initialMasked ?? 0
      : 0
  );
  const [simUpgrade, setSimUpgrade] = useState({});

  const handleNarrativeDone = useCallback(() => {
    setPhase("challenge");
  }, []);

  const handleSimChange = useCallback((state) => {
    setSimState((prev) => ({ ...prev, ...state }));
  }, []);

  const handleHintClick = useCallback((term) => {
    setPendingAiInput(`explain: ${term}`);
  }, []);

  const handleOptimizeCorrect = useCallback(() => {
    if (chapter.isWrongPathChapter) {
      setPhase("wrongpath_witness");
      return;
    }
    if (chapter.optimize?.coherentWarp) {
      setSimUpgrade((u) => ({ ...u, coherentWarp: true }));
      return;
    }
    if (chapter.optimize?.fixedMasked != null) {
      setSimInitialMasked(chapter.optimize.fixedMasked);
      return;
    }
    if (chapter.optimize?.parallelWorkers != null) {
      setSimUpgrade((u) => ({
        ...u,
        parallelWorkers: chapter.optimize.parallelWorkers,
      }));
      return;
    }
    if (chapter.optimize?.unlockMaxThreads != null) {
      setSimUpgrade((u) => ({
        ...u,
        maxThreadCount: chapter.optimize.unlockMaxThreads,
      }));
    }
  }, [chapter.isWrongPathChapter, chapter.optimize]);

  const handlePendingConsumed = useCallback(() => {
    setPendingAiInput("");
  }, []);

  useEffect(() => {
    if (phase !== "challenge") return;
    if (!chapter.target) return;
    if (meetsTarget(chapter.target, simState)) {
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

  const wrongPathData = chapter.wrongPath ?? null;

  useEffect(() => {
    setPhase("narrative");
    setPendingAiInput("");
    setShowWinMessage(false);
    setSimUpgrade({});
    setSimState(getInitialSimState(chapter));
    setSimInitialMasked(
      chapter.simulation?.type === "warp"
        ? chapter.simulation.initialMasked ?? 0
        : 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when chapter id changes
  }, [chapter.id]);

  const simType = chapter.simulation?.type ?? "warp";
  const simReadonly = phase === "success" || chapter.simulation?.readonly;

  const renderSimulation = () => {
    switch (simType) {
      case "sequential-vs-parallel":
        return (
          <SequentialVsParallelSim
            parallelWorkers={simUpgrade.parallelWorkers ?? 1}
            readonly={simReadonly}
            onChange={handleSimChange}
          />
        );
      case "thread-count":
        return (
          <ThreadCountSim
            maxThreadCount={simUpgrade.maxThreadCount ?? 2}
            readonly={simReadonly}
            onChange={handleSimChange}
          />
        );
      case "race-condition":
        return <RaceConditionSim readonly={simReadonly} onChange={handleSimChange} />;
      case "cpu-vs-gpu":
        return <CpuVsGpuSim readonly={simReadonly} onChange={handleSimChange} />;
      case "mandelbrot-warp":
        return (
          <MandelbrotWarpSim
            initialRegion={chapter.simulation?.initialRegion ?? "boundary"}
            readonly={simReadonly}
            coherentWarp={!!simUpgrade.coherentWarp}
            onCoherentWarpConsumed={() =>
              setSimUpgrade((u) => {
                const { coherentWarp: _c, ...rest } = u;
                return rest;
              })
            }
            onChange={handleSimChange}
          />
        );
      case "warp":
      default:
        return (
          <WarpSimulation
            initialMasked={simInitialMasked}
            readonly={simReadonly}
            onChange={handleSimChange}
          />
        );
    }
  };

  const targetLine =
    chapter.target && formatTargetCurrent(chapter.target, simState);

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
            {`// CH${chapter.number}: ${chapter.title}`}
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
                {"// MISSION BRIEFING"}
              </p>
              <ChapterNarrative lines={chapter.narrative} onDone={handleNarrativeDone} />
            </section>
          )}

          {phase === "wrongpath_witness" && wrongPathData && (
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
                  {"// MISSION BRIEFING"}
                </p>
                <div className="space-y-1 font-mono text-xs" style={{ color: "var(--green-dim)" }}>
                  {chapter.narrative.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </section>
              <WrongPathReveal
                wrongPath={wrongPathData}
                onContinue={handleWrongPathContinue}
              />
            </>
          )}

          {(phase === "challenge" || phase === "success") && (
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
                  {"// MISSION BRIEFING"}
                </p>
                <div className="space-y-1 font-mono text-xs" style={{ color: "var(--green-dim)" }}>
                  {chapter.narrative.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </section>

              <CodePanel codeSnippet={chapter.codeSnippet} />

              {chapter.optimize && (
                <OptimizePanel
                  key={chapter.id}
                  optimize={chapter.optimize}
                  onCorrect={handleOptimizeCorrect}
                />
              )}

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
                  {"// SIMULATION"}
                </p>
                {renderSimulation()}
                {chapter.target && (
                  <div className="mt-3 text-xs" style={{ color: "var(--green-dim)" }}>
                    <span className="font-bold" style={{ color: "var(--green)" }}>
                      {"// TARGET: "}
                    </span>
                    {chapter.target.label}
                    {targetLine && (
                      <span className="ml-2" style={{ color: "var(--green)" }}>
                        {targetLine}
                      </span>
                    )}
                  </div>
                )}
              </section>

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
                    {"// chapter complete. "}
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

          {phase === "wrongpath_reveal" && wrongPathData && (
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
            {"// XRAY-AI"}
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
