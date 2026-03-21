import { useState, useCallback } from "react";
import { getChapterById, getNextChapter } from "./story/chapters.js";
import { useStoryProgress } from "./hooks/useStoryProgress.js";
import { IntroScreen } from "./components/IntroScreen.jsx";
import { StoryMap } from "./components/StoryMap.jsx";
import { StoryView } from "./components/StoryView.jsx";

export default function App() {
  const [view, setView] = useState(
    () => (sessionStorage.getItem("xray-intro-seen") ? "storymap" : "intro")
  );
  const {
    currentChapterId,
    setCurrentChapter,
    markComplete,
    isComplete,
  } = useStoryProgress();

  const activeChapter = currentChapterId ? getChapterById(currentChapterId) : null;

  const handleJackIn = useCallback(() => {
    sessionStorage.setItem("xray-intro-seen", "1");
    setView("storymap");
  }, []);

  const openChapter = useCallback(
    (id) => {
      setCurrentChapter(id);
      setView("story");
    },
    [setCurrentChapter]
  );

  const goStoryMap = useCallback(() => {
    setView("storymap");
  }, []);

  const handleChapterComplete = useCallback(() => {
    if (!currentChapterId) return;
    markComplete(currentChapterId);
    const next = getNextChapter(currentChapterId);
    if (next) {
      setCurrentChapter(next.id);
      setView("story");
    } else {
      goStoryMap();
    }
  }, [currentChapterId, markComplete, setCurrentChapter, goStoryMap]);

  if (view === "intro") {
    return <IntroScreen onEnter={handleJackIn} />;
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", color: "var(--green)" }}
    >
      {(view === "storymap" || view === "story") && (
        <>
          {view === "storymap" && (
            <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--green)" }}>
              <header
                className="border-b px-4 py-4 backdrop-blur"
                style={{
                  borderColor: "var(--border)",
                  background: "rgba(2,10,3,0.9)",
                }}
              >
                <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="glow-text text-lg font-bold tracking-widest sm:text-xl">
                      PARALLEL_XRAY
                    </h1>
                    <p
                      className="text-xs tracking-wider"
                      style={{ color: "var(--green-dim)" }}
                    >
                      // GPU optimization — story mode
                    </p>
                  </div>
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
                </div>
              </header>
              <main className="mx-auto max-w-5xl px-4 py-6">
                <StoryMap
                  isComplete={isComplete}
                  currentChapterId={currentChapterId}
                  onSelect={openChapter}
                />
              </main>
            </div>
          )}

          {view === "story" && activeChapter && (
            <StoryView
              chapter={activeChapter}
              onComplete={handleChapterComplete}
              onGoMap={goStoryMap}
            />
          )}

          {view === "story" && !activeChapter && (
            <div className="flex min-h-screen items-center justify-center p-4">
              <p style={{ color: "var(--green-dim)" }}>
                // unknown chapter —{" "}
                <button
                  type="button"
                  onClick={goStoryMap}
                  className="underline"
                >
                  return to map
                </button>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
