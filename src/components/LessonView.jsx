import { useEffect, useState } from "react";
import { OverviewCard } from "./OverviewCard.jsx";
import { TheoryPanel } from "./TheoryPanel.jsx";
import { SimulationPanel } from "./SimulationPanel.jsx";

function LessonPanels({ lessonMod }) {
  if (!lessonMod) {
    return (
      <p
        className="rounded p-4 text-xs tracking-wide"
        style={{ border: "1px solid var(--border)", color: "var(--green-dim)" }}
      >
        // loading module...
      </p>
    );
  }

  const Theory = lessonMod.Theory;
  const Simulation = lessonMod.Simulation;

  return (
    <>
      <TheoryPanel>{Theory ? <Theory /> : null}</TheoryPanel>
      <SimulationPanel>{Simulation ? <Simulation /> : null}</SimulationPanel>
    </>
  );
}

export function LessonView({ lesson, onBack, onSkip, onCompleteAndNext }) {
  const [lessonMod, setLessonMod] = useState(null);

  useEffect(() => {
    setLessonMod(null);
    let cancelled = false;
    lesson.component().then((m) => {
      if (!cancelled) setLessonMod(m);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
      <OverviewCard
        title={lesson.title}
        subtitle={lesson.subtitle}
        painPoint={lesson.painPoint}
        onSkip={onSkip}
      />

      <LessonPanels lessonMod={lessonMod} />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded px-4 py-2 text-xs tracking-widest transition-all"
          style={{
            border: "1px solid var(--border)",
            color: "var(--green-dim)",
            background: "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green-dim)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          [ &lt;- MAP ]
        </button>
        <button
          type="button"
          onClick={onCompleteAndNext}
          className="rounded px-5 py-2 text-xs font-bold tracking-widest transition-all"
          style={{
            border: "1px solid var(--green)",
            color: "var(--bg)",
            background: "var(--green)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 16px #00ff4166";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          [ MARK COMPLETE + NEXT {"->"} ]
        </button>
      </div>
    </div>
  );
}
