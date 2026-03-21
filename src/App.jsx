import { useState, useCallback } from "react";
import { LESSONS, getLessonById, getNextLesson } from "./lessons/registry.js";
import { useLessonProgress } from "./hooks/useLessonProgress.js";
import { IntroScreen } from "./components/IntroScreen.jsx";
import { Roadmap } from "./components/Roadmap.jsx";
import { LessonView } from "./components/LessonView.jsx";

export default function App() {
  const [view, setView] = useState(
    () => (sessionStorage.getItem("xray-intro-seen") ? "roadmap" : "intro")
  );
  const [activeId, setActiveId] = useState(null);
  const { markDone, isDone } = useLessonProgress();

  const activeLesson = activeId ? getLessonById(activeId) : null;

  const handleJackIn = useCallback(() => {
    sessionStorage.setItem("xray-intro-seen", "1");
    setView("roadmap");
  }, []);

  const openLesson = useCallback((id) => {
    setActiveId(id);
    setView("lesson");
  }, []);

  const goRoadmap = useCallback(() => {
    setView("roadmap");
  }, []);

  const handleSkip = useCallback(() => {
    if (activeId) markDone(activeId);
    goRoadmap();
  }, [activeId, markDone, goRoadmap]);

  const handleCompleteAndNext = useCallback(() => {
    if (!activeId) return;
    markDone(activeId);
    const next = getNextLesson(activeId);
    if (next) {
      setActiveId(next.id);
    } else {
      goRoadmap();
    }
  }, [activeId, markDone, goRoadmap]);

  if (view === "intro") {
    return <IntroScreen onEnter={handleJackIn} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--green)" }}>
      <header
        className="border-b px-4 py-4 backdrop-blur"
        style={{ borderColor: "var(--border)", background: "rgba(2,10,3,0.9)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="glow-text text-lg font-bold tracking-widest sm:text-xl">
              PARALLEL_XRAY
            </h1>
            <p className="text-xs tracking-wider" style={{ color: "var(--green-dim)" }}>
              // GPU concepts — one level at a time
            </p>
          </div>
          {view === "lesson" ? (
            <button
              type="button"
              onClick={goRoadmap}
              className="self-start rounded px-3 py-1.5 text-xs tracking-widest transition"
              style={{
                border: "1px solid var(--green-dim)",
                color: "var(--green-dim)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--green)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--green-dim)")}
            >
              [ MAP ]
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView("intro")}
              className="self-start rounded px-3 py-1.5 text-xs tracking-widest transition"
              style={{
                border: "1px solid var(--border)",
                color: "#1a3d1e",
              }}
              title="Show intro screen again"
            >
              [ REBOOT ]
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === "roadmap" ? (
          <div className="flex flex-col gap-6">
            <p className="text-xs leading-relaxed tracking-wide" style={{ color: "#1a5c20" }}>
              // Follow the path in order, or jump to any level.{" "}
              <span style={{ color: "var(--green-dim)" }}>&quot;I know this — skip&quot;</span> marks
              the level cleared and advances the map.
            </p>
            <Roadmap
              lessons={LESSONS}
              isDone={isDone}
              onSelect={openLesson}
              selectedId={activeId}
            />
          </div>
        ) : null}

        {view === "lesson" && activeLesson ? (
          <LessonView
            lesson={activeLesson}
            onBack={goRoadmap}
            onSkip={handleSkip}
            onCompleteAndNext={handleCompleteAndNext}
          />
        ) : null}

        {view === "lesson" && !activeLesson ? (
          <p style={{ color: "var(--green-dim)" }}>// unknown lesson — return to map</p>
        ) : null}
      </main>
    </div>
  );
}
